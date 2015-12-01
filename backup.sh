#!env bash
NOW=$(date +%Y-%m-%d_%H:%M:%S)
source config.sh

pushd backup
TODAY_START=$(gdate --date="$(date +%Y-%m-%d)" +%s%3N)
TODAY_END=$(( $TODAY_START + 86400 *1000 ))

echo $TODAY_START
echo $TODAY_END

curl --silent localhost:5000/participants.csv?start=${TODAY_START}\&end=${TODAY_END} > ${NOW}.csv
curl --silent localhost:5000/participants.csv > participants.csv
cp ../participants.db ${NOW}.db

[[ -z $BREGALAD_REPORT_EMAIL ]] && \
  curl --silent -X POST -d "{\"email\":\"$BREGALAD_REPORT_EMAIL\"}" localhost:5000/report

popd
