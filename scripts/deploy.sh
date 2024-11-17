#!/bin/bash
set -e

if sudo docker ps -a | grep -q "solar-system"
then
    echo "Container found. Stopping..."
    sudo docker stop "solar-system" && sudo docker rm "solar-system"
    echo "Container stopped and removed."
fi

sudo docker run --name solar-system \
    -e MONGO_URI=$MONGO_URI \
    -e MONGO_USERNAME=$MONGO_USERNAME \
    -e MONGO_PASSWORD=$MONGO_PASSWORD \
    -p 5555:5555 -d ayazumman.xyz/jenkins/solar-system:$GIT_COMMIT
