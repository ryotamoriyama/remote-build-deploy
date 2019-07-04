#!/usr/bin/env node
'use strict';

//ライブラリ読み込み
const consola = require('consola');
const fs = require('fs-extra');
const spawn = require('child_process');
const argv = require('argv');

//オプション
argv.option([{
        name: 'forceBuild',
        short: 'f',
        type: 'boolean',
    }, {
        name: 'config',
        short: 'c',
        type: 'string',
    }
    ]
);

const args = argv.run();
console.log(args);

//パスの指定
const lockFilePath = 'cue/lock';
const configJson = (args.options.config != undefined) ? args.options.config : 'config.json';

//config読み込み
const config = JSON.parse(fs.readFileSync(configJson, 'utf8'));

const projectPath = config['project_path'];
const branch = config['branch'];

const commitDetail = [];
const updatedFiles = [];

//ロックファイルを削除してプロセス終了
function removeLockFile() {
    fs.unlinkSync(lockFilePath);
}


function slackNotification(status, title, text = '') {
    if (config['slack']['enable'] !== 1) {
        return;
    }
    let color = (status === 0) ? '#00FF00' : '#ff0000';
    let num = (text.length > 3600) ? Math.ceil((text.length) / 3600) : 1;
    for (let i = 0; i < num; i++) {
        let slack = spawn.spawnSync('curl', ['-X', 'POST', '-H', 'Content-type: application/json', '--data', "{'attachments':[{'title':'" + config['name'] + " - " + branch + " - " + title + "', 'title_link': '" + commitDetail[0] + "', 'color':'" + color + "','fields':[{'value':'" + text.substring((i * 3600), Math.min((((i + 1) * 3600) - 1), text.length)) + "'}]},]}", config['slack']['hook_url']], {
            cwd: process.cwd(),
            env: process.env,
            stdio: 'pipe',
            encoding: 'utf-8'
        });
        console.log(slack);
    }
}

//ロックファイルの存在確認
function statusCheck() {
    try {
        fs.statSync(lockFilePath);
        //ロックファイルがある場合終了
        throw new Error('Lock file already exists');
    } catch (err) {
        fs.writeFile(lockFilePath, '');
        consola.info('Created lock file');
    }
}

//コミットIDチェック
function commitIdCheck() {
    const commitIdCheck = spawn.spawnSync('bash', ['scripts/commit_id_check.sh', projectPath, branch]);
    if (commitIdCheck.status === 0) {
        throw new Error('Repository is latest');
    } else {
        consola.info('Repository is behind');
    }
}

//git fetch
function gitFetch() {
    consola.start('Git fetch');
    const gitFetch = spawn.spawnSync('bash', ['scripts/git_fetch.sh', projectPath, branch], {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'pipe',
        encoding: 'utf-8'
    });

    gitFetch.stdout.split('\n').forEach((file) => {
        if (file !== '') {
            updatedFiles.push(file);
        }
    });

    if (!args.options.forceBuild && updatedFiles.length === 0) {
        throw new Error('There are no updated files');
    } else {
        consola.info('Updated files');
        consola.log(gitFetch.stdout);
    }
}

//最新コミット詳細取得
function getCommitDetail() {
    consola.start('commit detail');
    let commitData = spawn.spawnSync('bash', ['scripts/commit_detail.sh', projectPath], {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'pipe',
        encoding: 'utf-8'
    });
    let res = commitData.output[1].split('\n');
    let commitId = res[2].replace(/^.+?\s/, '');
    let url = res[0].replace(':', '/').replace(/^.+@/g, 'https://').replace(/\.git.+$/g, '');
    url += '/commits/' + commitId + '/';
    let author = res[3].replace(/^.+?\s/g, '');

    commitDetail.push(url, author, commitId);
    consola.log(commitDetail);

    slackNotification(0, 'Start deploying', url + ' by ' + author);
}

function updatePackage() {
    consola.info('Check package update');
    config['update_package'].forEach((update_package) => {
        if (!args.options.forceBuild) {
            updatedFiles.forEach((file) => {
                if (file === update_package.path) {
                    updatePackageCore(update_package);
                }
            });
        } else {
            updatePackageCore(update_package);
        }
    });
}

function updatePackageCore(update_package) {
    consola.info(update_package.path);
    let packageInstall = spawn.spawnSync('bash', ['scripts/update_package.sh', projectPath, update_package.command], {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'pipe',
        encoding: 'utf-8'
    });
    consola.start(packageInstall);
    if (packageInstall.status !== 0) {
        slackNotification(1, 'package - ' + update_package.command, packageInstall.stderr);
        throw new Error();
    } else {
        slackNotification(0, 'package', update_package.command);
    }
}

function build() {
    consola.info('Check src update');
    config['build'].forEach((build) => {
        if (!args.options.forceBuild) {
            let regex = new RegExp(build.path_pattern);
            for (let i = 0; i < updatedFiles.length; i++) {
                if (updatedFiles[i].match(regex)) {
                    buildCore(build);
                    break;
                }
            }
        } else {
            buildCore(build);
        }
    });
}

function buildCore(build) {
    consola.start('start building ' + build.command);
    let buildRes = spawn.spawnSync('bash', ['scripts/build.sh', projectPath, build.command], {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'pipe',
        encoding: 'utf-8'
    });
    console.log(buildRes);
    if (buildRes.status !== 0) {
        slackNotification(1, 'build - ' + build.command, buildRes.stderr);
        throw new Error();
    } else {
        slackNotification(0, 'build', build.command);
    }
}

function rsync() {
    let dryRun = (config['slack']['dry_run'] === 1) ? '--dry-run' : '';
    config['rsync'].forEach((rsync) => {
        consola.start('rsync');
        let exclude = '';
        if (rsync.exclude != undefined && rsync.exclude.length > 0) {
            rsync.exclude.forEach((ex) => {
                exclude += '--exclude='+ex+' ';
            })
        }
        let rsyncRes = spawn.spawnSync('bash', ['scripts/rsync.sh', projectPath, rsync.from, rsync.to, config['rsync_path'], dryRun, exclude], {
            cwd: process.cwd(),
            env: process.env,
            stdio: 'pipe',
            encoding: 'utf-8'
        });
        console.log(rsyncRes);
        if (rsyncRes.status !== 0) {
            slackNotification(1, 'rsync - ' + dryRun + rsync.from, rsyncRes.stderr);
            throw new Error();
        } else {
            if (rsyncRes.stdout.split('\n').length > 5) {
                slackNotification(0, 'rsync - ' + dryRun + rsync.from, rsyncRes.stdout);
            }
        }
    })
}


Promise.resolve()
    .then(statusCheck)
    .then(
        function () {
            if (!args.options.forceBuild) {
                commitIdCheck();
            }
        }
    )
    .then(gitFetch)
    .then(getCommitDetail)
    .then(updatePackage)
    .then(build)
    .then(rsync)
    .then(
        function () {
            slackNotification(0, 'All process were done');
            removeLockFile()
        }
    ).catch((err) => {
    console.log(err);
    removeLockFile()
});