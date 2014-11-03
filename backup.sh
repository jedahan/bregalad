[ -e ./config.sh ] && . ./config.sh

TODAY=$(date +%y%M%d)
NOW=$(date +%y%M%d%H%m%S)
TODAY_START=$(date --date=$(date +%Y-%m-%d) +%s)
TODAY_END=$(date --date="$(date +%Y-%m-%d) 1 day" +%s)

echo $TODAY_START $TODAY_END

curl localhost:5000/participants.csv?start=$TODAY_START&end=$TODAY_END > ${NOW}.csv
curl localhost:5000/participants.csv > participants.csv
cp participants.db ${NOW}.db

sftp -i ${IDENTITY:-${HOME}/.ssh/id_rsa} ${USERNAME:-$USER}@${HOST:-127.0.0.1} << EOF
put participants.db
put participants.csv
put ${NOW}.db
put ${NOW}.csv
bye
EOF

rm ${NOW}.db
rm ${NOW}.csv
