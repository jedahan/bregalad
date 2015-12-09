#!/bin/bash
pushd backup
NOW=$(date +%Y-%m-%d_%H:%M:%S)
TODAY_START=$(gdate --date="$(date +%Y-%m-%d)" +%s%3N)
TODAY_END=$(( $TODAY_START + 86400 *1000 ))

curl --silent localhost:5000/participants.csv?start=${TODAY_START}\&end=${TODAY_END} > ${NOW}.csv
curl --silent localhost:5000/participants.csv > participants.csv
cp ../participants.db ${NOW}.db
popd

source config.sh
for email in "${BREGALAD_REPORT_EMAILS[@]}"; do
  curl -X POST -d "{\"email\":\"$email\"}" -H "Content-Type: application/json" localhost:5000/report
done
