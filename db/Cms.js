const mongoose = require('mongoose');

const cmsSchema = new mongoose.Schema({
  title: { type: String, required: true },   
  body: { type: String, required: true },    
  type: { type: String, required: true },   
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('cms', cmsSchema);