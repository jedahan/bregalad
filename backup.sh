pushd backup

TODAY=$(date +%y%M%d)
NOW=$(date +%Y-%m-%d_%H:%M:%S)
TODAY_START=$(date --date="$(date +%Y-%m-%d)" +%s)
TODAY_END=$(($TODAY_START + 86400))

echo $TODAY_START $TODAY_END

echo curl "localhost:5000/participants.csv?start=${TODAY_START}&end=${TODAY_END}" > ${NOW}.csv
curl localhost:5000/participants.csv > participants.csv
cp ../participants.db ${NOW}.db

popd
