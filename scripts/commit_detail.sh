#!/bin/bash

REPO_ROOT=$1

cd ${REPO_ROOT}

git remote -v
git log -1