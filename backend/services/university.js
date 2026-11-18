const University = require("../models/University");
const config = require("../config/env");

// Returns the university new users and clubs belong to, creating it on first
// use. (One tenant for now; the data model already supports more.)
async function getDefaultUniversity() {
  return University.findOneAndUpdate(
    { slug: config.defaultUniversity.slug },
    { $setOnInsert: { name: config.defaultUniversity.name, shortName: config.defaultUniversity.shortName } },
    { upsert: true, new: true }
  );
}

module.exports = { getDefaultUniversity };
