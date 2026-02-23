#!/bin/bash

# Return if no filename parameter was provided
if [ "$#" -eq 0 ]; then
    echo "Please provide the name of the backup file to be restored."
    exit 1
fi

# Set filename, backup directory and temporary directory from where the dump will be loaded into the database
DUMP_FILENAME="$1"
APP_DIR="$HOME/hildegard/atag-editor"
BACKUP_DIR="$HOME/hildegard/backups"
TEMP_DIR="$BACKUP_DIR/temp"

# Stop the database (required)
cd $APP_DIR

echo "Stopping database..."

# docker compose -f docker-compose.yml stop neo4j > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "Database stopped."
else
    echo "Error: Failed to stop the database."
    exit 1
fi

echo "Restoring backup..."

sudo chown -R maxmiche "$BACKUP_DIR"

# Create the temp directory and clean it
mkdir -p "$TEMP_DIR"
sudo rm -rf "$TEMP_DIR/*"

# Copy the given dump to the temp directory and rename it to neo4j.dump (default name, is required)
cp "$BACKUP_DIR/$DUMP_FILENAME" "$TEMP_DIR/"
mv "$TEMP_DIR/$DUMP_FILENAME" "$TEMP_DIR/neo4j.dump"

# Load dump into the mounted data folder
docker run --interactive --tty --rm \
    --volume="$APP_DIR/neo4j/data:/data" \
    --volume="$TEMP_DIR:/temp" \
    neo4j:5.26 \
    neo4j-admin database load neo4j --from-path=/temp --overwrite-destination > /dev/null 2>&1

# Check if the load command succeeded
if [ $? -eq 0 ]; then
    echo "Database restored successfully from $DUMP_FILENAME."
else
    echo "Error: Failed to load the database from $DUMP_FILENAME."
fi

# Finally: Remove the temp directory
rm -rf "$TEMP_DIR"

# Restart the database
docker compose -f docker-compose.yml up neo4j -d

echo "Database restarted."
