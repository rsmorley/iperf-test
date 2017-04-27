
function getTests(req, res) {
  return res.status(200).json();
}

function createTest(req, res) {
  return res.status(200).json();
}

function getTest(req, res) {
  return res.status(200).json();
}

function deleteTest(req, res) {
  return res.status(200).json();
}

module.exports = {
  getTests: getTests,
  createTest: createTest,
  getTest: getTest,
  deleteTest: deleteTest
};
