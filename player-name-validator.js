import DiscordBasePlugin from './discord-base-plugin.js';
import axios from 'axios';

export default class PlayerNameValidator extends DiscordBasePlugin {
    static get description() {
        return "Player Name Validator plugin";
    }

    static get defaultEnabled() {
        return true;
    }

    static get optionsSpecification() {
        return {
            ...DiscordBasePlugin.optionsSpecification,
            channelID: {
                required: true,
                description: 'The ID of the channel to log admin broadcasts to.',
                default: '',
                example: '667741905228136459'
            },
            kickMessage: {
                required: false,
                description: "",
                default: "You have been kicked due to non-compliant username.\n\nForbidden: %FORBIDDEN%",
            },
            playerCountThreshold: {
                required: false,
                description: "minimum amount of player that allows kicking",
                default: 40,
            },
            dictionaries: {
                required: false,
                description: "",
                default: [],
                example: [
                    {
                        id: 'example',
                        url: ''
                    }
                ],
            },
            rules: {
                required: false,
                description: "",
                default: [
                    {
                        type: "regex",
                        logic: "match=allow",
                        rule: /a-z\d=\$\[\]\!\.\s\-/
                    }
                ],
                example: [
                    {
                        type: "regex",
                        logic: "match=kick",
                        logic: "match=allow",
                        rule: /[^a-z\d=\$\[\]\!\.\s\-]/
                    },
                    {
                        type: "equals",
                        rule: "D*CK"
                    },
                    {
                        type: "includes",
                        rule: "F*CK"
                    }
                ]
            }
        };
    }

    constructor(server, options, connectors) {
        super(server, options, connectors);

        this.onPlayerConnected = this.onPlayerConnected.bind(this)
        this.discordLog = this.discordLog.bind(this)
        this.getDictionary = this.getDictionary.bind(this);
        this.loadAllDictionaries = this.loadAllDictionaries.bind(this);

        this.dictionaries = new Map();

        this.broadcast = (msg) => { this.server.rcon.broadcast(msg); };
        this.warn = (steamid, msg) => { this.server.rcon.warn(steamid, msg); };
    }

    async mount() {
        this.server.on('PLAYER_CONNECTED', this.onPlayerConnected);
        this.loadAllDictionaries();
    }

    async unmount() {
        this.server.removeEventListener("PLAYER_CONNECTED", this.onPlayerConnected);
    }

    async loadAllDictionaries() {
        for (let dK in this.options.dictionaries) {
            const d = this.options.dictionaries[ dK ];
            let error = [];
            if (!d.id) error.push('Missing ID');
            if (!d.url) error.push('Missing URL');
            if (error.length > 0) {
                this.verbose(1, `Could not pull dictionary ${dK}. Errors: ${error.join('; ')}`)
                continue;
            }

            this.getDictionary(d)
        }
    }

    async getDictionary(dicObj) {
        const url = dicObj.url;
        const id = dicObj.id;
        this.verbose(1, 'Pulling dictionary from url', url)
        const res = (await axios.get(url)).data.split('\n').map(n => n.toLowerCase());
        this.dictionaries.set(id, res)
        this.verbose(1, `Successfully pulled dictionary ${id}. Content: ${res.slice(0, 5).join('; ')} [...]`)
    }

    onPlayerConnected(info) {
        // if (this.server.a2sPlayerCount < this.options.playerCountThreshold) return;
        if (!info) return;
        const { steamID, name: playerName } = info.player || info;
        if (!playerName) return;
        let match = false;
        let kick = false;
        let rule = null;
        for (let r of this.options.rules) {
            // this.verbose(1, `Player connected: "${playerName}" - Players: ${this.server.a2sPlayerCount} - Rule: "${r.description}" - Rule Player Threshold: ${r.playerCountThreshold} - Master Player Threshold: ${this.options.playerCountThreshold}`)
            if (this.server.a2sPlayerCount < (r.playerCountThreshold || this.options.playerCountThreshold)) continue;
            r.type = r.type.toLowerCase();
            r.logic = r.logic.toLowerCase();

            switch (r.type) {
                case 'regex':
                    r.rule = r.rule.replace(/^\//, '').replace(/\/$/, '')

                    const reg = new RegExp(r.rule, "gi");
                    match = playerName.match(reg)?.join(', ')

                    // switch (r.logic) {
                    //     case 'match=allow':
                    //         if (!regRes) kick = playerName;
                    //         break;
                    //     case 'match=kick':
                    //     default:
                    //         if (regRes) kick = regRes.join(', ')
                    // }
                    // this.verbose(1, "Testing rule", info.squadName, reg, disband)
                    break;
                case 'equals':
                    match = playerName.toLowerCase() === r.rule.toLowerCase() ? playerName : false;
                    break;
                case 'includes':
                    match = playerName.toLowerCase().includes(r.rule.toLowerCase()) ? r.rule : false;
                    break;
                case 'startsWith':
                    match = playerName.toLowerCase().startsWith(r.rule.toLowerCase()) ? r.rule : false;
                    break;
                case 'endsWith':
                    match = playerName.toLowerCase().endsWith(r.rule.toLowerCase()) ? r.rule : false;
                    break;
                case 'dictionary':
                    if (!r.dictionaryId) {
                        this.verbose(1, `Rule "${r.description || 'Unknown'}" is missing property "dictionaryId"`)
                        continue;
                    }
                    match = this.dictionaries.get(r.dictionaryId)?.find(n => playerName.toLowerCase().includes(n)) ? r.rule : false;
                    break;
                default:
            }

            switch (r.logic) {
                case 'match=allow':
                    if (!match) kick = true;
                    break;
                case 'match=kick':
                default:
                    if (match) kick = true;
                    break;
            }

            rule = r;

            if (kick) break
        }
        this.verbose(1, "Player Connected:", playerName, match, kick)

        if (kick) {
            const kickMessage = (rule.kickMessage || this.options.kickMessage).replace(/\%FORBIDDEN\%/ig, match);
            this.server.rcon.execute(`AdminKick ${steamID} ${kickMessage}`);
            this.warn(info.player.steamID, kickMessage)
            this.discordLog(info, match, rule)
        }
    }

    async discordLog(info, forbidden, rule = null) {
        let regex = rule ? new RegExp(rule.rule, "gi").toString() : null;
        await this.sendDiscordMessage({
            embed: {
                title: `Player Kicked: ${info.player.name}`,
                color: "ee1111",
                fields: [
                    {
                        name: 'Username',
                        value: info.player.name,
                        inline: true
                    },
                    {
                        name: 'SteamID',
                        value: `[${info.player.steamID}](https://steamcommunity.com/profiles/${info.player.steamID})`,
                        inline: true
                    },
                    {
                        name: 'Forbidden Chars/Word',
                        value: forbidden
                    },
                    (regex ? { name: 'Logic', value: rule.logic.toLowerCase(), inline: true } : null),
                    (regex ? { name: 'Regex', value: regex.toString(), inline: true } : null)
                ].filter(e => e),
                timestamp: info.time.toISOString()
            }
        });
    }
}
