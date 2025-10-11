# Deploy configuration
FRONTEND_BUILD_DIR="/ix.star-siec.edu.vn/frontend/build"
BACKEND_DIR="/ix.star-siec.edu.vn/backend"
MAX_RETRIES=3
RETRY_DELAY=10

# Function to handle file upload with retries
upload_file() {
    local src="$1"
    local dest="$2"
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        echo "Uploading $src to $dest (attempt $attempt)..."
        
        if curl --connect-timeout 30 \
             --retry 3 --retry-delay 5 \
             --ftp-create-dirs \
             -T "$src" \
             -u "$FTP_USERNAME:$FTP_PASSWORD" \
             "ftp://$FTP_HOST$dest"; then
            echo "✓ Upload successful"
            return 0
        fi
        
        echo "⚠️ Upload failed"
        attempt=$((attempt + 1))
        [ $attempt -le $MAX_RETRIES ] && sleep $RETRY_DELAY
    done
    
    echo "❌ Upload failed after $MAX_RETRIES attempts"
    return 1
}

# Function to execute PHP script on server
execute_php() {
    local url="$1"
    local response
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        echo "Executing $url (attempt $attempt)..."
        response=$(curl -s "$url")
        
        if [[ $response != *"Error"* ]] && [[ $response != *"failed"* ]]; then
            echo "✓ Execution successful"
            echo "$response"
            return 0
        fi
        
        echo "⚠️ Execution failed: $response"
        attempt=$((attempt + 1))
        [ $attempt -le $MAX_RETRIES ] && sleep $RETRY_DELAY
    done
    
    echo "❌ Execution failed after $MAX_RETRIES attempts"
    return 1
}

# Function to create and upload deployment script
create_deploy_script() {
    local type="$1"
    local script_content="$2"
    local script_name="deploy_${type}.php"
    
    echo "$script_content" > "$script_name"
    upload_file "$script_name" "/$script_name" || return 1
    execute_php "https://$FTP_HOST/$script_name" || return 1
    rm "$script_name"
    return 0
}