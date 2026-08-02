#!/bin/bash
set -e
trivy fs --severity HIGH,CRITICAL --exit-code 1 .
docker build -t studyhub:scan .
trivy image --severity HIGH,CRITICAL --exit-code 1 --ignore-unfixed studyhub:scan
