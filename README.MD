## SquadNameValidator
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
    "kickMessage": "(Optional) This warning message will override the default message.\n\nForbidden: %FORBIDDEN%", 
}
```

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
    "rules": [
        {
            "type": "regex",
            "logic": "match=allow",
            "rule": "/[a-z\\d]/",
            "kickMessage": "This warning message will override the default message.\n\nForbidden: %FORBIDDEN%",    
        },
        {
            "description": "Kicks every player whose username does not contain at least 3 latin letter",
            "type": "regex",
            "logic": "match=allow",
            "rule": "/[a-z]{3,}/"
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
