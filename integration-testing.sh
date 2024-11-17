#!/bin/bash
echo "Integration test on GCP........"

# Ensure jq is installed
echo "Installing jq if not already installed..."
if ! command -v jq &> /dev/null; then
    echo "jq not found. Installing..."
    sudo apt update && sudo apt install -y jq || { echo "Failed to install jq"; exit 1; }
fi

echo "jq is installed. Proceeding with the script..."

# Ensure gcloud CLI is installed and authenticated
gcloud --version || { echo "gcloud CLI not installed. Exiting..."; exit 1; }

# List all instances in the project
echo "Fetching GCP instance data..."
INSTANCE_DATA=$(gcloud compute instances list --format=json)
echo "Instance Data - $INSTANCE_DATA"

# Extract external IP of an instance with a specific tag
INSTANCE_IP=$(echo "$INSTANCE_DATA" | /usr/bin/jq -r '.[] | select(.tags.items[]? == "deploy") | .networkInterfaces[0].accessConfigs[0].natIP')
echo "Instance IP - $INSTANCE_IP"

if [[ -n "$INSTANCE_IP" ]]; then
    echo "Running HTTP checks..."
    
    # Perform health check
    http_code=$(curl -s -o /dev/null -w "%{http_code}" http://$INSTANCE_IP:5555/live)
    echo "HTTP Status Code - $http_code"

    # Perform planet data check
    planet_data=$(curl -s -XPOST http://$INSTANCE_IP:5555/planets -H "Content-Type: application/json" -d '{"id": "3"}')
    echo "Planet Data - $planet_data"
    
    planet_name=$(echo "$planet_data" | jq -r '.name')
    echo "Planet Name - $planet_name"

    # Validation logic
    if [[ "$http_code" -eq 200 && "$planet_name" == "Earth" ]]; then
        echo "HTTP Status Code and Planet Name Tests Passed"
    else
        echo "One or more test(s) failed"
        exit 1
    fi
else
    echo "No suitable instance found with the 'deploy' tag. Exiting..."
    exit 1
fi
