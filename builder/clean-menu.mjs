import fs from "node:fs/promises";
import path from "node:path";

const sourceArg = process.argv[2];
if (!sourceArg) throw new Error("Usage: node clean-menu.mjs <source-directory>");
const sourceDir = path.resolve(sourceArg);

async function mutate(relative, transform) {
  const file = path.join(sourceDir, relative);
  const original = await fs.readFile(file, "utf8");
  const updated = transform(original);
  if (updated === original) throw new Error(`Menu cleanup made no changes to ${relative}`);
  await fs.writeFile(file, updated, "utf8");
}

function replaceRequired(text, search, replacement, label) {
  if (!text.includes(search)) throw new Error(`Unable to find ${label}`);
  return text.replace(search, replacement);
}

await mutate("client/index.html", text => {
  const playButton = `              <button class="btn btn-lg btn-darken btn-primary" id="btn-play-solo">
                <span translation="play_solo"></span>
              </button>`;
  const cleanPlayButton = `              <button class="btn btn-lg btn-darken btn-primary" id="btn-play-solo">
                <span>Play</span>
              </button>
              <div id="shring-mode-note">Free-for-all online multiplayer</div>`;
  return replaceRequired(text, playButton, cleanPlayButton, "solo play button");
});

await mutate("client/src/scripts/ui.ts", text => {
  text = replaceRequired(
    text,
    "    for (const [regionID, { flag }] of regionMap) {",
    "    for (const [regionID, { flag, name }] of regionMap) {",
    "server-list region destructuring"
  );
  text = replaceRequired(
    text,
    '<span class="server-name">${flag ?? ""}${translate(`region_${regionID}` as TranslationKeys)}</span>',
    '<span class="server-name">${flag ?? ""}${name}</span>',
    "server list region label"
  );
  text = replaceRequired(
    text,
    '        const region = GameConsole.getBuiltInCVar("cv_region") || Config.defaultRegion;\n',
    "",
    "selected region variable"
  );
  text = replaceRequired(
    text,
    '        serverName.text(`${selectedRegion.flag ?? ""}${translate(`region_${region}` as TranslationKeys)}`);',
    '        serverName.text(`${selectedRegion.flag ?? ""}${selectedRegion.name}`);',
    "selected region label"
  );
  return text;
});

const css = `

/* Shring Outbreak clean main menu */
.marquee-container,
#splash-news,
#splash-socials,
#splash-featured-people,
#splash-partners,
.team-btns-container,
#next-switch-messages {
    display: none !important;
}

#splash-logo {
    margin-top: 28px !important;
    margin-bottom: 18px !important;
}

#splash-modals {
    position: relative !important;
    display: block !important;
    min-height: 330px !important;
    max-height: none !important;
    padding: 0 !important;
}

#splash-center {
    position: absolute !important;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 370px;
    max-width: calc(100vw - 32px) !important;
    margin: 0 !important;
}

#splash-customize {
    position: absolute !important;
    top: 0;
    right: 24px;
    width: 370px;
    margin: 0 !important;
}

#shring-mode-note {
    margin: 7px 0 2px;
    color: rgba(255, 255, 255, 0.78);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.15px;
    text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.8);
}

#shring-source-notice {
    right: 12px !important;
    bottom: 9px !important;
}

@media screen and (max-width: 1150px) {
    #splash-customize {
        display: none !important;
    }
}

@media screen and (max-width: 800px) {
    #splash-logo {
        margin-top: 12px !important;
    }

    #splash-modals {
        display: flex !important;
        min-height: 0 !important;
        padding: 5px !important;
    }

    #splash-center {
        position: static !important;
        left: auto !important;
        transform: none !important;
        width: min(370px, calc(100vw - 16px));
    }
}
`;

await fs.appendFile(path.join(sourceDir, "client/src/scss/pages/client/splash.scss"), css, "utf8");
console.log("Applied Shring Outbreak clean-menu patch");
