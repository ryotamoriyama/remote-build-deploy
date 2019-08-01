#!/bin/bash

REPO_ROOT=$1
BRANCH=$2

cd ${REPO_ROOT}

git reset --hard > /dev/null 2>&1
git checkout ${BRANCH} > /dev/null 2>&1
git pull origin ${BBRANCH} > /dev/null 2>&1