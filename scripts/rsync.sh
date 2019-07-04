#!/bin/bash

REPO_ROOT=$1
FROM=$2
TO=$3
RSYNC_PATH=$4
DRY_RUN=$5
EXCLUDE=$6

cd ${REPO_ROOT}

rsync -avhr --checksum --delete ${DRY_RUN} --exclude='node_modules' ${EXCLUDE}--rsync-path=${RSYNC_PATH} ${FROM} ${TO}
