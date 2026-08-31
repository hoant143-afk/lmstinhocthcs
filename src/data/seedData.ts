import {
  Teacher,
  ClassEntity,
  Student,
  Lesson,
  Task,
  TaskProgress,
  Assignment,
  Submission,
  Announcement,
  Certificate
} from '../types';

export const SEED_TEACHER: Teacher = {
  id: 'teacher_01',
  fullName: 'Thầy Nguyễn Văn Hoàng',
  email: 'giaovien@school.edu.vn',
  password: 'password123',
  title: 'Giáo viên Bộ môn Tin học & Công nghệ',
  schoolName: 'Trường THPT Chuyên Quốc Gia',
  subject: 'Tin học',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  createdAt: '2026-01-01T08:00:00.000Z'
};

export const SEED_TEACHERS: Teacher[] = [
  SEED_TEACHER,
  {
    id: 'teacher_02',
    fullName: 'Cô Trần Thị Mai Lan',
    email: 'mailan.tran@school.edu.vn',
    password: 'password123',
    title: 'Tổ trưởng Chuyên môn STEM & Robotics',
    schoolName: 'Trường Liên cấp Thực nghiệm Sư phạm',
    subject: 'Khoa học STEM',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-05T08:00:00.000Z'
  }
];

export const SEED_CLASSES: ClassEntity[] = [
  {
    id: 'class_10a1',
    teacherId: 'teacher_01',
    name: 'Lớp 10A1 - Tin học & Sáng tạo Số',
    subject: 'Tin học',
    grade: 'Lớp 10',
    schoolYear: '2025 - 2026',
    description: 'Mô hình học tập Blended: 30% Tự học Online (Video, Tài liệu, Quiz) + 70% Thực hành Trực tiếp trên lớp (Coding, Dự án nhóm, Thuyết trình).',
    classCode: 'TIN10-A1',
    certificateEnabled: true,
    scoringEnabled: true,
    onlineRatio: 30,
    offlineRatio: 70,
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-02-15T09:30:00.000Z'
  },
  {
    id: 'class_11a3',
    teacherId: 'teacher_01',
    name: 'Lớp 11A3 - Lập trình Python & Trí tuệ Nhân tạo',
    subject: 'Khoa học Máy tính',
    grade: 'Lớp 11',
    schoolYear: '2025 - 2026',
    description: 'Khóa học thực chiến tư duy lập trình cấu trúc dữ liệu và ứng dụng AI cơ bản.',
    classCode: 'PY11-A3',
    certificateEnabled: true,
    scoringEnabled: true,
    onlineRatio: 30,
    offlineRatio: 70,
    createdAt: '2026-01-12T08:00:00.000Z',
    updatedAt: '2026-02-18T10:00:00.000Z'
  },
  {
    id: 'class_stem9',
    teacherId: 'teacher_01',
    name: 'CLB STEM 9 - Robot & Tự động hóa',
    subject: 'STEM Robotics',
    grade: 'Lớp 9',
    schoolYear: '2025 - 2026',
    description: 'Lớp kỹ năng tự do trải nghiệm lắp ráp mạch vi điều khiển và lập trình cảm biến.',
    classCode: 'STEM-901',
    certificateEnabled: false,
    scoringEnabled: false,
    onlineRatio: 30,
    offlineRatio: 70,
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-20T14:00:00.000Z'
  },
  {
    id: 'class_7a11',
    teacherId: 'teacher_01',
    name: 'Lớp 7A11 - Tin học & Trải nghiệm Số',
    subject: 'Tin học 7',
    grade: 'Lớp 7',
    schoolYear: '2025 - 2026',
    description: 'Mô hình Blended Learning lớp 7: 30% Tự học trực tuyến chống tua + 70% Thực hành bảng tính & thiết kế trên lớp.',
    classCode: 'TIN7_7A11',
    status: 'active',
    joinEnabled: true,
    certificateEnabled: true,
    scoringEnabled: true,
    onlineRatio: 30,
    offlineRatio: 70,
    createdAt: '2026-02-10T08:00:00.000Z',
    updatedAt: '2026-02-20T14:00:00.000Z'
  }
];

export const SEED_STUDENTS: Student[] = [
  {
    id: 'student_01',
    classId: 'class_10a1',
    fullName: 'Trần Minh Anh',
    joinedAt: '2026-01-15T08:30:00.000Z',
    status: 'active',
    email: 'minhanh.tran@student.edu.vn'
  },
  {
    id: 'student_02',
    classId: 'class_10a1',
    fullName: 'Lê Hoàng Nam',
    joinedAt: '2026-01-15T08:45:00.000Z',
    status: 'active',
    email: 'hoangnam.le@student.edu.vn'
  },
  {
    id: 'student_03',
    classId: 'class_10a1',
    fullName: 'Nguyễn Thị Mai Linh',
    joinedAt: '2026-01-16T09:10:00.000Z',
    status: 'active',
    email: 'mailinh.nguyen@student.edu.vn'
  },
  {
    id: 'student_04',
    classId: 'class_10a1',
    fullName: 'Phạm Tuấn Kiệt',
    joinedAt: '2026-01-16T09:20:00.000Z',
    status: 'active',
    email: 'tuankiet.pham@student.edu.vn'
  },
  {
    id: 'student_05',
    classId: 'class_11a3',
    fullName: 'Vũ Đức Trí',
    joinedAt: '2026-01-18T10:00:00.000Z',
    status: 'active',
    email: 'ductri.vu@student.edu.vn'
  }
];

export const SEED_LESSONS: Lesson[] = [
  {
    id: 'lesson_01',
    teacherId: 'teacher_01',
    classId: 'class_10a1',
    title: 'Bài 1: Khám phá Trí tuệ Nhân tạo & Nguyên lý Hoạt động',
    description: 'Tìm hiểu tổng quan về AI, Machine Learning, nguyên tắc Prompt Engineering và thực hành xây dựng giải pháp số trên lớp.',
    objectives: [
      'Hiểu khái niệm cốt lõi về Trí tuệ nhân tạo (AI) và Học máy (ML).',
      'Nắm vững kỹ thuật viết prompt hiệu quả (Context, Role, Task, Format).',
      'Thảo luận và làm việc nhóm trực tiếp tại phòng máy để xây dựng sản phẩm mẫu.',
      'Báo cáo và nhận đánh giá từ Giáo viên.'
    ],
    coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    status: 'active',
    openAt: '2026-01-15T00:00:00.000Z',
    dueAt: '2026-03-30T23:59:59.000Z',
    sequentialLock: true,
    scoringEnabled: true,
    order: 1,
    createdAt: '2026-01-14T10:00:00.000Z',
    updatedAt: '2026-02-10T11:00:00.000Z'
  },
  {
    id: 'lesson_02',
    teacherId: 'teacher_01',
    classId: 'class_10a1',
    title: 'Bài 2: Thiết kế Giao diện UI/UX & Phát triển Web Cơ bản',
    description: 'Chuẩn bị kiến thức về bố cục lưới, màu sắc, Typography online. Đến lớp lập trình trang web cá nhân và nghiệm thu.',
    objectives: [
      'Hiểu nguyên tắc Visual Hierarchy và thiết kế Responsive.',
      'Sử dụng thẻ HTML ngữ nghĩa và CSS Flexbox/Grid.',
      'Nộp bài tập qua link Github / Canva / Drive.',
      'Trình bày sản phẩm trước lớp học.'
    ],
    coverImage: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80',
    status: 'active',
    openAt: '2026-02-01T00:00:00.000Z',
    dueAt: '2026-04-15T23:59:59.000Z',
    sequentialLock: true,
    scoringEnabled: true,
    order: 2,
    createdAt: '2026-01-20T10:00:00.000Z',
    updatedAt: '2026-02-15T11:00:00.000Z'
  },
  {
    id: 'lesson_03',
    teacherId: 'teacher_01',
    classId: 'class_10a1',
    title: 'Bài 3: Tư duy Thuật toán & Cấu trúc Dữ liệu Ứng dụng',
    description: 'Bài học nâng cao rèn luyện giải quyết bài toán thực tế kết hợp giải thuật tìm kiếm, sắp xếp.',
    objectives: [
      'Phân tích độ phức tạp thời gian O(n).',
      'Cài đặt thuật toán tìm kiếm nhị phân.',
      'Hoạt động nhóm thi đấu lập trình trực tiếp.'
    ],
    coverImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
    status: 'published',
    openAt: '2026-03-01T00:00:00.000Z',
    dueAt: '2026-05-01T23:59:59.000Z',
    sequentialLock: true,
    scoringEnabled: true,
    order: 3,
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-02-20T11:00:00.000Z'
  },
  {
    id: 'lesson_7a11_01',
    teacherId: 'teacher_01',
    classId: 'class_7a11',
    title: 'Bài 1: Làm quen với Bảng tính Điện tử & Định dạng Dữ liệu',
    description: 'Tìm hiểu giao diện bảng tính, kiểu dữ liệu số/chuỗi, công thức tính toán cơ bản và thực hành bài tập trên lớp.',
    objectives: [
      'Nắm vững khái niệm ô (cell), hàng (row), cột (column) và địa chỉ ô.',
      'Sử dụng các hàm cơ bản SUM, AVERAGE, COUNT, MAX, MIN.',
      'Thực hiện bài tập thực hành tạo bảng điểm và tính tổng kết.'
    ],
    coverImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
    status: 'active',
    openAt: '2026-02-10T00:00:00.000Z',
    dueAt: '2026-04-30T23:59:59.000Z',
    sequentialLock: true,
    scoringEnabled: true,
    order: 1,
    createdAt: '2026-02-10T10:00:00.000Z',
    updatedAt: '2026-02-20T11:00:00.000Z'
  }
];

export const SEED_TASKS: Task[] = [
  // Tasks for lesson_7a11_01
  {
    id: 'task_7a11_01_video',
    lessonId: 'lesson_7a11_01',
    title: '1. [Online] Xem video: Hướng dẫn Thao tác Bảng tính Điện tử Cơ bản',
    description: 'Xem toàn bộ video bài giảng (hệ thống có cơ chế đo lường thời gian xem thực tế, chống tua bài).',
    type: 'video',
    phase: 'online',
    required: true,
    order: 1,
    settings: {
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      videoDurationSeconds: 120,
      contentMarkdown: '### Mục tiêu bài học Tin học 7:\n- Nhập và căn chỉnh dữ liệu\n- Sử dụng công thức tính toán\n- Lưu và chia sẻ bảng tính'
    },
    createdAt: '2026-02-10T10:00:00.000Z'
  },
  {
    id: 'task_7a11_02_quiz',
    lessonId: 'lesson_7a11_01',
    title: '2. [Online] Trắc nghiệm Kiểm tra Nhanh Kiến thức Bảng tính',
    description: 'Làm 4 câu hỏi trắc nghiệm kiểm tra mức độ nắm vững bài học trực tuyến.',
    type: 'quiz',
    phase: 'online',
    required: true,
    order: 2,
    settings: {
      passScore: 75,
      questions: [
        {
          id: 'q1',
          prompt: 'Trong bảng tính điện tử, giao giữa một cột và một hàng được gọi là gì?',
          options: ['Trường dữ liệu', 'Ô tính (Cell)', 'Khối ô', 'Trang tính'],
          correctIndex: 1,
          explanation: 'Giao của cột và hàng tạo thành ô tính (Cell), có địa chỉ ví dụ như A1, B5.'
        },
        {
          id: 'q2',
          prompt: 'Ký tự đầu tiên bắt buộc phải gõ khi nhập công thức tính toán là gì?',
          options: ['Dấu cộng (+)', 'Dấu hai chấm (:)', 'Dấu bằng (=)', 'Dấu ngoặc đơn (()'],
          correctIndex: 2,
          explanation: 'Trong mọi phần mềm bảng tính, công thức bắt buộc phải bắt đầu bằng dấu "=".'
        }
      ]
    },
    createdAt: '2026-02-10T10:00:00.000Z'
  },
  {
    id: 'task_7a11_03_practice',
    lessonId: 'lesson_7a11_01',
    title: '3. [Tại Lớp] Thực hành Tạo Bảng Điểm & Tính Điểm Trung Bình',
    description: 'Thực hành trực tiếp tại phòng máy, nhập dữ liệu bảng điểm và sử dụng hàm AVERAGE tính điểm trung bình.',
    type: 'practice',
    phase: 'offline',
    required: true,
    order: 3,
    settings: {
      contentMarkdown: '### Nhiệm vụ thực hành:\n1. Mở phần mềm bảng tính trên máy tính\n2. Nhập danh sách 5 bạn trong tổ\n3. Tính điểm trung bình môn Tin học'
    },
    createdAt: '2026-02-10T10:00:00.000Z'
  },
  {
    id: 'task_7a11_04_submit',
    lessonId: 'lesson_7a11_01',
    title: '4. [Nộp Sản Phẩm] Nộp File Bảng Tính hoặc Link Bài Làm',
    description: 'Nộp link Google Drive, OneDrive hoặc file bài tập để Giáo viên chấm điểm và nhận xét.',
    type: 'assignment',
    phase: 'offline',
    required: true,
    order: 4,
    settings: {
      maxScore: 10,
      allowLinks: true,
      allowFileUpload: true
    },
    createdAt: '2026-02-10T10:00:00.000Z'
  },
  // Tasks for lesson_01
  {
    id: 'task_01_video',
    lessonId: 'lesson_01',
    title: '1. [Online] Xem video: Giới thiệu Tổng quan về Trí tuệ Nhân tạo & LLM',
    description: 'Xem toàn bộ bài giảng (hệ thống có cơ chế theo dõi thời lượng thực tế, chống tua nhanh vượt bài).',
    type: 'video',
    phase: 'online',
    required: true,
    order: 1,
    settings: {
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      videoDurationSeconds: 180,
      contentMarkdown: '### Mục tiêu bài giảng:\n- Khái niệm Trí tuệ nhân tạo (AI)\n- Mô hình ngôn ngữ lớn (LLM)\n- Cách AI phân tích dữ liệu'
    },
    createdAt: '2026-01-14T10:00:00.000Z'
  },
  {
    id: 'task_01_doc',
    lessonId: 'lesson_01',
    title: '2. [Online] Tài liệu đọc: Kỹ thuật Prompt Engineering chuẩn 4 bước',
    description: 'Nghiên cứu tài liệu hướng dẫn viết câu lệnh tối ưu cho AI trước khi đến lớp thảo luận.',
    type: 'document',
    phase: 'online',
    required: true,
    order: 2,
    settings: {
      contentMarkdown: `## Hướng dẫn Kỹ thuật Prompt Engineering Chuẩn 4 Bước

Để làm việc hiệu quả với các mô hình AI, bạn cần cấu trúc câu lệnh theo công thức:

### 1. Vai trò (Role)
Xác định danh tính chuyên gia cho AI (Ví dụ: *"Bạn là một chuyên gia lập trình web 10 năm kinh nghiệm..."*).

### 2. Bối cảnh (Context)
Cung cấp thông tin nền tảng về dự án, đối tượng mục tiêu, hạn chế kỹ thuật.

### 3. Nhiệm vụ cụ thể (Task)
Mô tả rõ ràng hành động bạn muốn AI thực hiện (Ví dụ: *"Hãy phân tích đoạn mã sau và chỉ ra 3 lỗi logic tiềm ẩn..."*).

### 4. Định dạng đầu ra (Format & Constraints)
Chỉ định dạng bảng, JSON, bullet point hoặc ngôn ngữ cụ thể.

---
**💡 Nhiệm vụ chuẩn bị:** Hãy suy nghĩ một đề tài dự án nhóm bạn muốn triển khai trong buổi học trực tiếp!`
    },
    createdAt: '2026-01-14T10:05:00.000Z'
  },
  {
    id: 'task_01_quiz',
    lessonId: 'lesson_01',
    title: '3. [Online] Mini Quiz: Kiểm tra độ hiểu biết (Vượt qua ≥ 70%)',
    description: 'Làm bài kiểm tra ngắn 3 câu hỏi để củng cố kiến thức trước khi mở khóa phần thực hành.',
    type: 'quiz',
    phase: 'online',
    required: true,
    order: 3,
    settings: {
      minQuizPassScore: 70,
      quizQuestions: [
        {
          id: 'q1',
          question: 'Thành phần nào KHÔNG nằm trong công thức Prompt chuẩn 4 bước?',
          type: 'multiple_choice',
          points: 10,
          options: [
            { id: 'opt_1', text: 'Vai trò (Role)', isCorrect: false },
            { id: 'opt_2', text: 'Bối cảnh (Context)', isCorrect: false },
            { id: 'opt_3', text: 'Mật khẩu đăng nhập hệ thống', isCorrect: true },
            { id: 'opt_4', text: 'Định dạng đầu ra (Format)', isCorrect: false }
          ],
          explanation: 'Công thức 4 bước gồm Role, Context, Task và Format.'
        },
        {
          id: 'q2',
          question: 'Mô hình học tập Blended Learning tại lớp phân chia tỉ lệ như thế nào?',
          type: 'multiple_choice',
          points: 10,
          options: [
            { id: 'opt_5', text: '50% Online – 50% Trực tiếp', isCorrect: false },
            { id: 'opt_6', text: '30% Online – 70% Trực tiếp', isCorrect: true },
            { id: 'opt_7', text: '100% Online', isCorrect: false },
            { id: 'opt_8', text: '10% Online – 90% Trực tiếp', isCorrect: false }
          ],
          explanation: 'Mô hình lớp học áp dụng chuẩn 30% Online tự học + 70% Trực tiếp thực hành trên lớp.'
        },
        {
          id: 'q3',
          question: 'Mô hình ngôn ngữ lớn (LLM) có khả năng tự suy luận có ý thức như con người?',
          type: 'true_false',
          points: 10,
          options: [
            { id: 'opt_9', text: 'Đúng', isCorrect: false },
            { id: 'opt_10', text: 'Sai (LLM hoạt động dựa trên dự đoán xác suất từ ngữ)', isCorrect: true }
          ],
          explanation: 'LLM là mô hình xác suất toán học dự đoán token tiếp theo, không có ý thức sinh học.'
        }
      ]
    },
    createdAt: '2026-01-14T10:10:00.000Z'
  },
  {
    id: 'task_01_assignment',
    lessonId: 'lesson_01',
    title: '4. [Offline - 70%] Bài nộp Dự án: File thiết kế Prompt & Kịch bản Ứng dụng',
    description: 'Thực hành trên lớp: Nhóm học sinh phối hợp viết kịch bản Prompt ứng dụng, nộp link Google Drive, Docs hoặc Canva.',
    type: 'assignment',
    phase: 'offline',
    required: true,
    order: 4,
    settings: {
      maxScore: 10,
      allowTextSubmission: true,
      allowUrlSubmission: true,
      promptQuestion: 'Dán link Google Docs / Drive / Canva chứa tài liệu kịch bản Prompt của nhóm bạn, kèm mô tả ngắn gọn.'
    },
    createdAt: '2026-01-14T10:15:00.000Z'
  },
  {
    id: 'task_01_offline_confirm',
    lessonId: 'lesson_01',
    title: '5. [Offline - 70%] Thuyết trình & Giáo viên Nghiệm thu Trực tiếp tại Lớp',
    description: 'Đại diện nhóm trình bày sản phẩm 3 phút trước lớp. Giáo viên trực tiếp nhận xét và bấm nút xác nhận hoàn thành.',
    type: 'teacher_confirmation',
    phase: 'offline',
    required: true,
    order: 5,
    settings: {
      requiresTeacherSignOff: true,
      offlineActivityGuide: 'Học sinh chuẩn bị slide hoặc chạy demo tại bàn máy tính giáo viên để được nghiệm thu trực tiếp.',
      rubricNotes: 'Tiêu chí: Tư duy sáng tạo (4đ), Tính thực tiễn (3đ), Khả năng thuyết trình & phản biện (3đ).'
    },
    createdAt: '2026-01-14T10:20:00.000Z'
  },

  // Tasks for lesson_02
  {
    id: 'task_02_video',
    lessonId: 'lesson_02',
    title: '1. [Online] Video bài giảng: Nguyên lý Bố cục UI và CSS Flexbox',
    description: 'Nắm vững kỹ thuật căn chỉnh phần tử và lưới Responsive trong 15 phút.',
    type: 'video',
    phase: 'online',
    required: true,
    order: 1,
    settings: {
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      videoDurationSeconds: 150
    },
    createdAt: '2026-01-20T10:00:00.000Z'
  },
  {
    id: 'task_02_assignment',
    lessonId: 'lesson_02',
    title: '2. [Offline - 70%] Thực hành code: Xây dựng Landing Page cá nhân',
    description: 'Lập trình trực tiếp tại phòng thực hành tin học. Nộp link Github repository hoặc CodePen.',
    type: 'assignment',
    phase: 'offline',
    required: true,
    order: 2,
    settings: {
      maxScore: 10,
      allowTextSubmission: true,
      allowUrlSubmission: true
    },
    createdAt: '2026-01-20T10:10:00.000Z'
  },
  {
    id: 'task_02_confirm',
    lessonId: 'lesson_02',
    title: '3. [Offline - 70%] Thầy cô chấm code và kiểm tra Responsive tại chỗ',
    description: 'Giáo viên kiểm tra trang web trên thiết bị di động và xác nhận hoàn thành bài học.',
    type: 'teacher_confirmation',
    phase: 'offline',
    required: true,
    order: 3,
    settings: {
      requiresTeacherSignOff: true
    },
    createdAt: '2026-01-20T10:15:00.000Z'
  }
];

export const SEED_ASSIGNMENTS: Assignment[] = [
  {
    id: 'assign_01',
    lessonId: 'lesson_01',
    taskId: 'task_01_assignment',
    title: 'Kịch bản Prompt & Bộ giải pháp AI cho Học tập',
    instructions: 'Hãy nộp link tài liệu Google Docs hoặc Canva trình bày giải pháp Prompt Engineering của nhóm. Tài liệu cần nêu rõ: Mục tiêu, Đối tượng phục vụ, 4 bước Prompt và kết quả thử nghiệm thực tế.',
    dueAt: '2026-03-30T23:59:59.000Z',
    maxScore: 10,
    allowText: true,
    allowUrl: true
  },
  {
    id: 'assign_02',
    lessonId: 'lesson_02',
    taskId: 'task_02_assignment',
    title: 'Mã nguồn Landing Page cá nhân (HTML/CSS/JS)',
    instructions: 'Nộp đường dẫn Github / Vercel / Figma hoặc Canva chứa sản phẩm giao diện hoàn chỉnh.',
    dueAt: '2026-04-15T23:59:59.000Z',
    maxScore: 10,
    allowText: true,
    allowUrl: true
  }
];

export const SEED_SUBMISSIONS: Submission[] = [
  {
    id: 'sub_01',
    assignmentId: 'assign_01',
    taskId: 'task_01_assignment',
    lessonId: 'lesson_01',
    studentId: 'student_01', // Trần Minh Anh - graded
    classId: 'class_10a1',
    text: 'Dạ em chào Thầy, nhóm 1 chúng em đã hoàn thành tài liệu Kịch bản Prompt trợ lý học tập Lịch sử 10. Kính gửi Thầy chấm bài ạ!',
    url: 'https://docs.google.com/document/d/sample-prompt-engineering-nhom1',
    urlType: 'google_docs',
    submittedAt: '2026-01-20T14:30:00.000Z',
    status: 'graded',
    score: 9.5,
    maxScore: 10,
    feedback: 'Bài làm xuất sắc! Cấu trúc 4 bước rất chi tiết, có phân tích ví dụ so sánh trước và sau khi tối ưu prompt.',
    gradedAt: '2026-01-21T09:00:00.000Z',
    gradedByTeacherId: 'teacher_01'
  },
  {
    id: 'sub_02',
    assignmentId: 'assign_01',
    taskId: 'task_01_assignment',
    lessonId: 'lesson_01',
    studentId: 'student_03', // Nguyễn Thị Mai Linh - submitted, pending grading
    classId: 'class_10a1',
    text: 'Nhóm 3 xin gửi link Canva Mindmap & Docs Prompting cho môn Hóa học.',
    url: 'https://canva.com/design/sample-group3-chemistry-ai',
    urlType: 'canva',
    submittedAt: '2026-02-12T16:20:00.000Z',
    status: 'submitted',
    maxScore: 10
  }
];

export const SEED_PROGRESS: TaskProgress[] = [
  // Student 01: Trần Minh Anh (100% completed Lesson 1)
  {
    id: 'prog_01_1',
    studentId: 'student_01',
    lessonId: 'lesson_01',
    taskId: 'task_01_video',
    status: 'completed',
    percent: 100,
    completedAt: '2026-01-16T10:00:00.000Z',
    metadata: {
      videoProgress: {
        studentId: 'student_01',
        taskId: 'task_01_video',
        currentTime: 180,
        maxWatchedTime: 180,
        duration: 180,
        percent: 100,
        completed: true,
        lastUpdatedAt: '2026-01-16T10:00:00.000Z'
      }
    }
  },
  {
    id: 'prog_01_2',
    studentId: 'student_01',
    lessonId: 'lesson_01',
    taskId: 'task_01_doc',
    status: 'completed',
    percent: 100,
    completedAt: '2026-01-16T10:15:00.000Z'
  },
  {
    id: 'prog_01_3',
    studentId: 'student_01',
    lessonId: 'lesson_01',
    taskId: 'task_01_quiz',
    status: 'completed',
    percent: 100,
    completedAt: '2026-01-16T10:30:00.000Z',
    metadata: {
      quizScore: 30,
      quizMaxScore: 30
    }
  },
  {
    id: 'prog_01_4',
    studentId: 'student_01',
    lessonId: 'lesson_01',
    taskId: 'task_01_assignment',
    status: 'completed',
    percent: 100,
    completedAt: '2026-01-20T14:30:00.000Z',
    metadata: {
      submissionId: 'sub_01'
    }
  },
  {
    id: 'prog_01_5',
    studentId: 'student_01',
    lessonId: 'lesson_01',
    taskId: 'task_01_offline_confirm',
    status: 'completed',
    percent: 100,
    completedAt: '2026-01-21T09:30:00.000Z',
    metadata: {
      confirmedByTeacherId: 'teacher_01',
      confirmedAt: '2026-01-21T09:30:00.000Z'
    }
  },

  // Student 02: Lê Hoàng Nam (In progress)
  {
    id: 'prog_02_1',
    studentId: 'student_02',
    lessonId: 'lesson_01',
    taskId: 'task_01_video',
    status: 'completed',
    percent: 100,
    completedAt: '2026-01-18T11:00:00.000Z',
    metadata: {
      videoProgress: {
        studentId: 'student_02',
        taskId: 'task_01_video',
        currentTime: 180,
        maxWatchedTime: 180,
        duration: 180,
        percent: 100,
        completed: true,
        lastUpdatedAt: '2026-01-18T11:00:00.000Z'
      }
    }
  },
  {
    id: 'prog_02_2',
    studentId: 'student_02',
    lessonId: 'lesson_01',
    taskId: 'task_01_doc',
    status: 'completed',
    percent: 100,
    completedAt: '2026-01-18T11:15:00.000Z'
  },
  {
    id: 'prog_02_3',
    studentId: 'student_02',
    lessonId: 'lesson_01',
    taskId: 'task_01_quiz',
    status: 'in_progress',
    percent: 50
  },

  // Student 03: Nguyễn Thị Mai Linh
  {
    id: 'prog_03_1',
    studentId: 'student_03',
    lessonId: 'lesson_01',
    taskId: 'task_01_video',
    status: 'completed',
    percent: 100,
    completedAt: '2026-02-10T14:00:00.000Z'
  },
  {
    id: 'prog_03_2',
    studentId: 'student_03',
    lessonId: 'lesson_01',
    taskId: 'task_01_doc',
    status: 'completed',
    percent: 100,
    completedAt: '2026-02-10T14:20:00.000Z'
  },
  {
    id: 'prog_03_3',
    studentId: 'student_03',
    lessonId: 'lesson_01',
    taskId: 'task_01_quiz',
    status: 'completed',
    percent: 100,
    completedAt: '2026-02-11T15:00:00.000Z',
    metadata: { quizScore: 30, quizMaxScore: 30 }
  },
  {
    id: 'prog_03_4',
    studentId: 'student_03',
    lessonId: 'lesson_01',
    taskId: 'task_01_assignment',
    status: 'completed',
    percent: 100,
    completedAt: '2026-02-12T16:20:00.000Z',
    metadata: { submissionId: 'sub_02' }
  }
];

export const SEED_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann_01',
    teacherId: 'teacher_01',
    classId: 'all',
    title: '🔔 Chào mừng các em đến với Hệ thống học tập Smart Blended LMS!',
    content: 'Chào các em học sinh! Khóa học áp dụng mô hình Blended Learning (30% Tự học Online tại nhà + 70% Thực hành và làm việc nhóm tại phòng Lab). Chúc các em có những giờ học bổ ích và sáng tạo!',
    isPinned: true,
    createdAt: '2026-01-10T08:00:00.000Z'
  },
  {
    id: 'ann_02',
    teacherId: 'teacher_01',
    classId: 'class_10a1',
    title: '📢 Lịch nghiệm thu sản phẩm Bài 1 tại phòng máy số 2',
    content: 'Thầy nhắc các nhóm hoàn thiện kịch bản Prompt trên Google Docs trước thứ Năm tuần này để chuẩn bị thuyết trình và nghiệm thu trực tiếp.',
    isPinned: false,
    createdAt: '2026-01-18T09:00:00.000Z'
  }
];

export const SEED_CERTIFICATES: Certificate[] = [
  {
    id: 'cert_01',
    studentId: 'student_01',
    studentName: 'Trần Minh Anh',
    classId: 'class_10a1',
    teacherId: 'teacher_01',
    teacherName: 'Thầy Nguyễn Văn Hoàng',
    courseName: 'Lớp 10A1 - Tin học & Sáng tạo Số',
    grade: 'Lớp 10',
    completionRate: 100,
    completedAt: '2026-01-21T09:30:00.000Z',
    issuedAt: '2026-01-21T10:00:00.000Z',
    certificateCode: 'BLN-CERT-2026-001'
  }
];
