## PlayerNameValidator
Player Name Validator plugin for SquadJS.
Automatically kicks players if their name is not compliant to specific rules.
Every rule is CASE-INSENSITIVE

### Rule format
```json
{
    "description": "(Optional) Human-readable description",
    "type": "regex | equals | includes | startsWith | endsWith",
    "logic": "MATCH=KICK | match=allow",
    "rule": "[^a-z\\d=\\$\\[\\]\\!\\.\\s\\-] | WORD",
    "playerCountThreshold": 20,
    "kickMessage": "(Optional) This warning message will override the default message.\n\nForbidden: %FORBIDDEN%", 
}
```
### Optional Rule Properties
- `description`: Not (yet) used, but useful to identify the scope of the rule
- `playerCountThreshold`: if set in the rule, it will override the "master" set from the plugin configuration
- `kickMessage`: if set in the rule, it will override the "master" set from the plugin configuration

### Useful Rules
```json
[
    {
        "description": "Kicks every player whose username does not contain at least 1 latin letter",
        "type": "regex",
        "logic": "match=allow",
        "rule": "/[a-z]/"
    }
]
```

### Example configuration
```json
{
    "plugin": "PlayerNameValidator",
    "enabled": true,
    "discordClient": "discord",
    "channelID": "1116600997722661199",
    "kickMessage": "You have been kicked due to non-compliant username.\n\nForbidden: %FORBIDDEN%",
    "playerCountThreshold": 40,
    "rules": [
        {
            "type": "regex",
            "logic": "match=allow",
            "rule": "/[a-z\\d]/",
            "kickMessage": "This warning message will override the default message.\n\nForbidden: %FORBIDDEN%",    
        },
        {
            "description": "Kicks every player whose username does not contain at least 3 consecutive latin letters",
            "type": "regex",
            "logic": "match=allow",
            "rule": "/[a-z]{3,}/"
        },
        {
            "description": "Kicks every player whose username does not contain at least any 3 latin letters",
            "type": "regex",
            "logic": "match=allow",
            "rule": "/([a-z].*?){3}/"
        },
        {
            "description": "",
            "type": "regex",
            "logic": "match=kick",
            "rule": "[^a-z\\d=\\$\\[\\]\\!\\.\\s\\-]"
        },
        {
            "type": "equals",
            "rule": "D*CK"
        },
        {
            "type": "includes",
            "rule": "F*CK"
        }
    ]
}
```
