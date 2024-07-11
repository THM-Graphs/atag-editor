# Text editor implementing the [Applied Text as Graph](https://git.thm.de/aksz15/atag) concept

## Installation

1. If you are using Windows, make sure [Windows Subsystem for Linux](https://learn.microsoft.com/de-de/windows/wsl/install) (WSL) and [Docker Desktop](https://www.docker.com/) are installed.

2. Open a command line tool (e.g. Ubuntu), select a directory, clone the repo and move into it.

   ```sh
   cd <your-directory-name>
   git clone https://github.com/THM-Graphs/atag-editor.git
   cd atag-editor
   ```

3. Copy the `.env.example` file to create your `.env` file. Afterwards, replace the placeholder values with actual values.

   ```sh
   cp .env.example .env
   ```

4. Install dependencies in your hosts's server and client folder.

   ```sh
   (cd server && npm install)
   (cd client && npm install)
   ```

5. Build docker containers and run the app

   ```
   docker compose up -d
   ```

   **Please be patient, Neo4j takes its time. Wait approx. 1 minute**.

You can now access the editor and the database:

- Editor start page with text overview: http://localhost:5173
- Neo4j database: http://localhost:7474
