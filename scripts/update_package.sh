#!/bin/bash

REPO_ROOT=$1
COMMAND=$2

cd ${REPO_ROOT}
RES=$(eval ${COMMAND})

if [ $? -ne 0 ]; then
    exit 1
else
    exit 0
fi