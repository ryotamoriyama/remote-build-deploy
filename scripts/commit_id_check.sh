#!/bin/bash

REPO_ROOT=$1
BRANCH=$2

cd ${REPO_ROOT}

git reset --hard
git checkout ${BRANCH}

RECENT=$(echo $(git ls-remote origin ${BRANCH}) | sed -e "s/[ \t]\{1,\}.*\$//g")
LOCAL=$(git rev-parse HEAD)

if [ ${RECENT} = ${LOCAL} ]; then
exit 0;
else
exit 1;
fi