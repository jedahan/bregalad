HOST=ftp.server.com
USER=username
PASS=password

TODAY=$(date +%y%M%d)
TODAY_START=$(date --date=$(date +%Y-%m-%d) +%s)
TODAY_END=$(date --date="$(date +%Y-%m-%d) 1 day" +%s)

echo $TODAY_START $TODAY_END

curl localhost:5000/participants.csv?start=$TODAY_START&end=$TODAY_END > ${TODAY}.csv
curl localhost:5000/participants.csv > participants.csv
cp participants.db ${TODAY}.db

sftp -inv $HOST << EOF
user $USER $PASS
put participants.db
put participants.csv
put ${TODAY}.db
put ${TODAY}.csv
bye
EOF
