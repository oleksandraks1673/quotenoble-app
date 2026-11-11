'use strict';
const {proxy} = require('./_upstream');
module.exports = (req, res) => proxy(req, res, '/api/project');
