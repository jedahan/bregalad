#!env bash
NOW=$(date +%Y-%m-%d_%H:%M:%S)

pushd backup
TODAY_START=$(date --date="$(date +%Y-%m-%d)" +%s)

curl --silent localhost:5000/participants.csv?start="${TODAY_START}" > ${NOW}.csv
curl --silent localhost:5000/participants.csv > participants.csv
cp ../participants.db ${NOW}.db

popd
