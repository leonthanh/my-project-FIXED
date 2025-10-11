# Deploy script for handling large file uploads
deploy_with_retry() {
  local source_dir=$1
  local target_dir=$2
  local chunk_size=10  # number of files per chunk
  local max_retries=3
  local retry_delay=10

  echo "Starting deployment from $source_dir to $target_dir"
  
  # Create list of files to upload
  cd "$source_dir"
  local files=($(find . -type f))
  local total_files=${#files[@]}
  echo "Found $total_files files to upload"

  # Process files in chunks
  for ((i=0; i<${#files[@]}; i+=$chunk_size)); do
    local chunk_start=$i
    local chunk_end=$((i + chunk_size - 1))
    [ $chunk_end -ge $total_files ] && chunk_end=$((total_files - 1))
    
    echo "Processing chunk $((i/$chunk_size + 1)) (files $((i+1)) to $((chunk_end+1)))"
    
    # Try to upload current chunk
    for ((retry=1; retry<=$max_retries; retry++)); do
      echo "Attempt $retry of $max_retries"
      
      local success=true
      for ((j=chunk_start; j<=chunk_end; j++)); do
        local file=${files[$j]}
        local target_file="$target_dir/${file:2}"  # Remove './' from start
        local dir=$(dirname "$target_file")
        
        # Create directory if needed
        curl -s --ftp-create-dirs -u "$FTP_USER:$FTP_PASS" "ftp://$FTP_HOST$dir/" || true
        
        # Upload file with timeout and retry
        if ! curl --connect-timeout 30 --retry 3 --retry-delay 5 \
             -T "$file" -u "$FTP_USER:$FTP_PASS" "ftp://$FTP_HOST$target_file"; then
          success=false
          break
        fi
      done
      
      if $success; then
        echo "✓ Chunk uploaded successfully"
        break
      else
        if [ $retry -eq $max_retries ]; then
          echo "❌ Failed to upload chunk after $max_retries attempts"
          return 1
        fi
        echo "⚠️ Chunk upload failed, retrying in $retry_delay seconds..."
        sleep $retry_delay
      fi
    done
  done
  
  echo "✓ Deployment completed successfully"
  return 0
}