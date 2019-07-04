#!/bin/bash

REPO_ROOT=$1
BRANCH=$2

cd ${REPO_ROOT}

git checkout ${BRANCH} > /dev/null 2>&1
git reset --hard > /dev/null 2>&1
git fetch origin ${BRANCH} > /dev/null 2>&1
git diff ${BRANCH} origin/${BRANCH} --name-only
git merge origin/${BRANCH} > /dev/null 2>&1