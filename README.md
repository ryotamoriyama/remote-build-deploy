* キーペアを作成する 
* 公開鍵を https://bitbucket.org/lig-admin/{repo}/admin/access-keys/ に登録する
* 秘密鍵をリモートの~/.sshに追加し、~/.ssh/configに登録する 
``` 
AddKeysToAgent yes
Host bitbucket.org
HostName bitbucket.org
Port 22
TCPKeepAlive yes
IdentitiesOnly yes
IdentityFile ~/.ssh/id_rsa
``` 
* sample-config.jsonをconfig.jsonにリネームし、各種設定をする
* npm installを実行
* crontabに登録 例： ```*/5 * * * * cd /home/bitnami/remote-build-deploy && /home/bitnami/.nodebrew/current/bin/node /home/bitnami/remote-build-deploy/index.js``` 

### つまずきそうなポイント
* node、npmの実行権限があるか
* rsync先の権限
* crontab実行ユーザーのパスが通ってない

## オプション
--forceBuild
 強制的にnpm install、ビルド、rsyncを実行する
--config
 config.json以外のファイルのパスを指定