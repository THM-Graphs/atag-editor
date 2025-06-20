# Web-based Editor for texts using the [Applied Text as Graph](https://git.thm.de/aksz15/atag) concept

## Demo

The static page demonstrates the editor core functionalities:
https://thm-graphs.github.io/atag-editor/

This version does not always reflect the latest changes of the development process. To get a full version of the app running, follow the instructions of the next chapter.

## Installation

1. If you are using Windows, make sure [Windows Subsystem for Linux](https://learn.microsoft.com/de-de/windows/wsl/install) (WSL), [Docker Desktop](https://www.docker.com/) and [Node.js](https://nodejs.org/en/download/package-manager) (in WSL) are installed.

2. Open a command line tool (e.g. Ubuntu), select a directory, clone the repo and move into it.

   ```sh
   cd <your-directory-name>
   git clone https://github.com/THM-Graphs/atag-editor.git
   cd atag-editor
   ```

3. Copy the `.env.example` file to create your `.env` file.

   ```sh
   cp .env.example .env
   ```

   **Afterwards, replace the placeholder values with actual values.**

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

## Deployment

To be updated

## Customization after Deployment

If you have a deployed version of the editor, you can customize it by providing you own configuration JSON file and your own CSS stylesheet. Both files must be available via URL and are referenced with environment variables in your `.env` file (`GUIDELINES_URL` and `STYLESHEET_URL`).

The JSON file provided by `GUIDELINES_URL` is a representation of your project-specific data model. It defines which labels and properties can be used inside the neo4j database, available annotation types etc. To start, you can follow one of the guidelines files in this repository like `guidelines.development.json`.

With the CSS stylesheet provided by `STYLESHEET_URL` you can style the appearance of the annotations inside the text as well as icons for each annotation type. You can refer to the [`annotations.css`](https://github.com/THM-Graphs/atag-editor/blob/main/client/src/styles/annotations.css) stylesheet in this repository to see how the styling is done. The class name of the span element must match the annotation type exactly.

```css
#text > span:has(span.myCustomAnnotationType) {
  background-color: lightgreen;
  opacity: 0.7;
}
```

Icons for annotation types are displayed in every place an annotation is referenced (toolbar, overview, details panel):

![image](https://gitlab.rlp.net/maxmiche/atag-assets/-/raw/main/ATAG_editor_screenshot_2025.png?ref_type=heads)

The icons can be embedded via [`background`](https://developer.mozilla.org/en-US/docs/Web/CSS/background) or [`background-image`](https://developer.mozilla.org/en-US/docs/Web/CSS/background-image) CSS property. It uses the native [`url`](https://developer.mozilla.org/en-US/docs/Web/CSS/url_function) CSS function to apply the icon. The icon container is an HTML element with the base class `annotation-type-icon-`, so to apply your own style rules, add the annotation type to the class (like `annotation-type-icon-myCustomAnnotationType`)

You have two possiblitities here:

1. Provide icons somewhere else and reference them via URL. This is is useful if you have e.g. a GitHub Repository or Cloud where you host your own SVGs.

```css
.annotation-type-icon-myCustomAnnotationType {
  background-image: url('https://raw.githubusercontent.com/THM-Graphs/atag-editor/refs/heads/main/client/public/icons/entity.svg');
}
```

2. Use a [data URL](https://developer.mozilla.org/en-US/docs/Web/CSS/url_function#using_a_data_url) where you can write the SVG directly into the `url` function.

```css
.annotation-type-icon-myCustomAnnotationType {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='45'%3E%3Cpath d='M10 10h60' stroke='%2300F' stroke-width='5'/%3E%3Cpath d='M10 20h60' stroke='%230F0' stroke-width='5'/%3E%3Cpath d='M10 30h60' stroke='red' stroke-width='5'/%3E%3C/svg%3E") !important;
}
```

Please note that you don't **HAVE** to add an icon for each annotation type. It is only a matter of styling, and the buttons will have the annotation type string as default:

![image](https://gitlab.rlp.net/maxmiche/atag-assets/-/raw/main/ATAG_editor_fallback_toolbar.png?ref_type=heads)
