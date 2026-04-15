// EdgeOne Pages Cloud Function Entry
// Since the project uses ES Modules, we dynamically import the compiled server
module.exports = async (req, res) => {
  const { app } = await import('../dist/server.js');
  return app(req, res);
};
