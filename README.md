WARNING
===

Please do not publicize this repository in any way. There are a few known documentation gaps and other issues we wish to address before publication. Thank you for your patience.

Tandem Realtime Coauthoring Engine
===

[![Build Status](https://secure.travis-ci.org/tandem/tandem.png?branch=master)](http://travis-ci.org/tandem/tandem)

How to Use
---

### Client

```javascript
var tandem = new Tandem.Client('http://localhost:8008');
var file = tandem.open(fileId);
file.on('file-update', function(delta) {
    // ...
});
file.update(delta);
```

### Server

```javascript
var Tandem = require('tandem')

var server = require('http').Server();
new Tandem.Server(server);
```


Installation
---
    
### NPM (Server)

Add to package.json

    "dependencies"  : {
        "tandem": "0.12.x"
    }


Testing
---

We use mocha as our testing framework. To run the unit tests, simply:
    
    make test

To run our coverage tool:

    make cov


Project Organization
---

### Top level files/directories

The tandem source code is in the **src** folder. Tests are in the **tests** folder.

All other files/directories are just supporting npm, build, demo, or documentation files.

    build - build output
    demo - demos
    doc - additional documentation
    scripts - test coverage script
    src - source code
    tests - unit tests
    browser.js - npm
    client.coffee - enable node.js to require src/client, used by unit tests
    Gruntfile.coffee - grunt configs
    index.js - npm
    Makefile - define make commands
    package.json - npm
