#!env bash
NOW=$(date +%Y-%m-%d_%H:%M:%S)

pushd backup
TODAY_START=$(date --date="$(date +%Y-%m-%d)" +%s)
TODAY_END=$(( $TODAY_START + 86400 ))

curl --silent localhost:5000/participants.csv?start=${TODAY_START}\&end=${TODAY_END} > ${NOW}.csv
curl --silent localhost:5000/participants.csv > participants.csv
cp ../participants.db ${NOW}.db

popd
