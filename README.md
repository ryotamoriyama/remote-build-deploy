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