#!/bin/bash
NOW=$(date +%Y-%m-%d_%H:%M:%S)
source config.sh

pushd backup
TODAY_START=$(gdate --date="$(date +%Y-%m-%d)" +%s%3N)
TODAY_END=$(( $TODAY_START + 86400 *1000 ))

curl --silent localhost:5000/participants.csv?start=${TODAY_START}\&end=${TODAY_END} > ${NOW}.csv
curl --silent localhost:5000/participants.csv > participants.csv
cp ../participants.db ${NOW}.db

[[ ! -z $BREGALAD_REPORT_EMAIL ]] && \
  curl -X POST -d "{\"email\":\"$BREGALAD_REPORT_EMAIL\"}" -H "Content-Type: application/json" localhost:5000/report
popd
