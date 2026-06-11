const mongoose = require('mongoose');
const Task = require('../models/taskModel.js').default;

describe('task model', () => {
  it('accepts the current minimum valid task payload', () => {
    const task = new Task({
      title: 'Inspect inverter output',
      owner: new mongoose.Types.ObjectId(),
    });

    const validationError = task.validateSync();

    expect(validationError).toBeUndefined();
    expect(task.priority).toBe('Low');
    expect(task.submissionStatus).toBe('not_submitted');
    expect(task.appealStatus).toBe('not_appealed');
  });

  it('requires both title and owner', () => {
    const task = new Task({});
    const validationError = task.validateSync();

    expect(validationError.errors.title).toBeDefined();
    expect(validationError.errors.owner).toBeDefined();
  });

  it('enforces the current priority enum', () => {
    const task = new Task({
      title: 'Inspect inverter output',
      owner: new mongoose.Types.ObjectId(),
      priority: 'Urgent',
    });

    const validationError = task.validateSync();

    expect(validationError.errors.priority).toBeDefined();
  });
});
