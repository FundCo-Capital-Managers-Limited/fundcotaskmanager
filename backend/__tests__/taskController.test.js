const mockReminderModel = {
  deleteMany: jest.fn(),
  findOne: jest.fn(),
};

const mockUserModel = {
  findById: jest.fn(),
};

const mockNotificationService = {
  createNotification: jest.fn(),
};

const mockAdminRealtime = {
  createNotificationInAdminBackend: jest.fn(),
};

const mockTaskModel = Object.assign(
  jest.fn(),
  {
    findById: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    find: jest.fn(),
    bulkWrite: jest.fn(),
  }
);

jest.mock('../models/taskModel.js', () => ({
  __esModule: true,
  default: mockTaskModel,
}));

jest.mock('../models/reminderModel.js', () => ({
  __esModule: true,
  default: mockReminderModel,
}));

jest.mock('../models/userModel.js', () => ({
  __esModule: true,
  default: mockUserModel,
}));

jest.mock('../utils/notificationService.js', () => mockNotificationService);
jest.mock('../utils/adminRealtime.js', () => mockAdminRealtime);

const {
  createTask,
  updateTask,
  submitTask,
} = require('../controllers/taskController.js');

const createResponse = () => {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
  };

  response.status.mockImplementation((statusCode) => {
    response.statusCode = statusCode;
    return response;
  });

  response.json.mockImplementation((payload) => {
    response.body = payload;
    return response;
  });

  return response;
};

const createIo = () => {
  const roomEmitter = jest.fn();
  return {
    emit: roomEmitter,
    to: jest.fn(() => ({ emit: roomEmitter })),
  };
};

describe('task controller', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockTaskModel.mockImplementation(function Task(data) {
      Object.assign(this, data);
      this._id = data._id || 'task-1';
      this.save = jest.fn().mockResolvedValue(this);
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('rejects new tasks with a past due date', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const response = createResponse();

    await createTask(
      {
        body: { title: 'Prepare report', dueDate: yesterday, checklist: [] },
        user: { _id: 'user-1' },
        io: createIo(),
      },
      response,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Due date for a new task cannot be in the past.',
    });
  });

  it('creates a task and emits it back to the owner channel', async () => {
    const io = createIo();
    const response = createResponse();

    await createTask(
      {
        body: {
          title: 'Prepare report',
          description: 'Summarize project blockers',
          priority: 'High',
          checklist: [{ text: 'Draft summary', completed: false }],
        },
        user: { _id: 'user-1' },
        io,
      },
      response,
    );

    expect(mockTaskModel).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Prepare report',
      description: 'Summarize project blockers',
      priority: 'High',
      owner: 'user-1',
      completed: false,
      createdByAdmin: false,
    }));
    expect(io.to).toHaveBeenCalledWith('user:user-1');
    expect(io.emit).toHaveBeenCalledWith('newTask', expect.objectContaining({ title: 'Prepare report' }));
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.body).toEqual({
      success: true,
      task: expect.objectContaining({ title: 'Prepare report' }),
    });
  });

  it('rejects an updated due date that predates task creation', async () => {
    mockTaskModel.findOne.mockResolvedValue({
      _id: 'task-1',
      owner: 'user-1',
      createdAt: '2026-06-10T12:00:00.000Z',
    });

    const response = createResponse();

    await updateTask(
      {
        params: { id: 'task-1' },
        body: { dueDate: '2026-06-09T09:00:00.000Z' },
        user: { _id: 'user-1' },
        io: createIo(),
      },
      response,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Due date cannot be earlier than the task creation date.',
    });
  });

  it('requires a completed task before submission', async () => {
    mockTaskModel.findOne.mockResolvedValue({
      _id: 'task-2',
      owner: 'user-1',
      completed: false,
      submissionStatus: 'not_submitted',
    });

    const response = createResponse();

    await submitTask(
      {
        params: { id: 'task-2' },
        user: { _id: 'user-1', fullName: 'Ada Analyst' },
        io: createIo(),
      },
      response,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Task must be completed before submission',
    });
  });

  it('submits a completed task and notifies the assigned admin', async () => {
    const io = createIo();
    const submittedTask = {
      _id: 'task-99',
      title: 'Close inspection report',
      owner: 'user-1',
      assignedBy: 'admin-7',
      completed: true,
      createdByAdmin: false,
      submissionStatus: 'not_submitted',
    };
    submittedTask.save = jest.fn().mockImplementation(async () => submittedTask);

    const updatedTask = {
      ...submittedTask,
      submissionStatus: 'submitted',
      submittedAt: new Date('2026-06-11T08:00:00.000Z'),
    };

    mockTaskModel.findOne.mockResolvedValue(submittedTask);
    mockTaskModel.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(updatedTask),
    });
    mockAdminRealtime.createNotificationInAdminBackend.mockResolvedValue(null);
    mockNotificationService.createNotification.mockResolvedValue({ id: 'notification-1' });

    const request = {
      params: { id: 'task-99' },
      user: { _id: 'user-1', fullName: 'Ada Analyst' },
      io,
    };
    const response = createResponse();

    await submitTask(request, response);

    expect(io.to).toHaveBeenCalledWith('user:user-1');
    expect(io.emit).toHaveBeenCalledWith('updateTask', expect.objectContaining({
      _id: 'task-99',
      submissionStatus: 'submitted',
    }));
    expect(mockAdminRealtime.createNotificationInAdminBackend).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'admin-7',
      type: 'task',
      title: 'Task submitted: Close inspection report',
      entityId: 'task-99',
    }));
    expect(mockNotificationService.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'admin-7',
      type: 'task',
      title: 'Task submitted: Close inspection report',
      body: 'Ada Analyst submitted this task for review.',
      entityId: 'task-99',
      entityType: 'Task',
      data: { taskId: 'task-99', status: 'submitted' },
      io,
    }));
    expect(response.body).toEqual({
      success: true,
      task: expect.objectContaining({ _id: 'task-99', submissionStatus: 'submitted' }),
    });
  });
});