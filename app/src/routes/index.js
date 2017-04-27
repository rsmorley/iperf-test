import express from 'express';
import testsController from '../controllers/tests-controller.js';
let router = express.Router();

router.route('/tests')
  .get(testsController.getTests);
router.route('/tests')
  .post(testsController.createTest);
router.route('/tests/:testId')
  .get(testsController.getTest);
router.route('/tests/:testId')
  .delete(testsController.deleteTest);
module.exports = router;
