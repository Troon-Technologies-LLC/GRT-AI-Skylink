#!/bin/bash
dir_placeholder="~/skylink-grt"
compose_file_placeholder="compose-skylink.yaml"
docker_repo_placeholder="troontech/be-packages-scan"
image_detail=$(docker images | awk '/skylink-grt/')
image_name=$(echo "$image_detail" | awk '/skylink-grt/ {print $2}')
echo "$image_name"
if [ "$image_name" = "skylink-grt" ];
then echo "---image found---";
cd $dir_placeholder
docker compose -f $compose_file_placeholder down
sleep 1
docker rmi -f $docker_repo_placeholder:$image_name
else echo "-----image not found----";
fi;
cd $dir_placeholder
docker compose -f $compose_file_placeholder up -d