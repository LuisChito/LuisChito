const fs = require('node:fs/promises');
const path = require('node:path');

const README_PATH = path.resolve(__dirname, '../README.mkd');
const START_MARKER = '<!-- EVENTO_HISTORICO:START -->';
const END_MARKER = '<!-- EVENTO_HISTORICO:END -->';

function twoDigits(value) {
    return String(value).padStart(2, '0');
}

function buildEventBlock(eventLine) {
    return `${START_MARKER}\n${eventLine}\n${END_MARKER}`;
}

async function getFirstHistoricalEvent(date) {
    const month = twoDigits(date.getMonth() + 1);
    const day = twoDigits(date.getDate());
    const url = `https://api.wikimedia.org/feed/v1/wikipedia/es/onthisday/events/${month}/${day}`;

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'LuisChito-Readme-Updater/1.0 (https://github.com/LuisChito)',
            'Api-User-Agent': 'LuisChito-Readme-Updater/1.0 (https://github.com/LuisChito)'
        }
    });

    if (!response.ok) {
        throw new Error(`Error en Wikimedia API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const firstEvent = data?.events?.[0];

    if (!firstEvent) {
        throw new Error('No se encontro ningun evento historico para hoy.');
    }

    const cleanText = String(firstEvent.text || '').replace(/\s+/g, ' ').trim();
    return `- ${twoDigits(date.getDate())}/${twoDigits(date.getMonth() + 1)}/${date.getFullYear()}: **Año ${firstEvent.year}** - ${cleanText}`;
}

async function updateReadme() {
    const now = new Date();
    const eventLine = await getFirstHistoricalEvent(now);
    const eventBlock = buildEventBlock(eventLine);
    const dateLabel = now.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    let readme = await fs.readFile(README_PATH, 'utf8');
    const markerRegex = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`, 'm');

    if (markerRegex.test(readme)) {
        readme = readme.replace(markerRegex, eventBlock);
    } else {
        readme += `\n\n## Acontecimiento historico de hoy\n\n${eventBlock}\n`;
    }

    readme = readme.replace(
        /\*[ÚU]ltima actualizaci[oó]n:[^*]*\*/i,
        `*Última actualización: ${dateLabel}*`
    );

    await fs.writeFile(README_PATH, readme, 'utf8');
    console.log('README actualizado con el primer acontecimiento historico del dia.');
}

updateReadme().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});