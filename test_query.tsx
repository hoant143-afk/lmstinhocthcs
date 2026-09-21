import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from './src/contexts/AuthContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { StudentLoginPage } from './src/pages/auth/StudentLoginPage';
import { StudentDashboardPage } from './src/pages/student/StudentDashboardPage';
import { StudentRegisterPage } from './src/pages/auth/StudentRegisterPage';
import { StudentProfilePage } from './src/pages/student/StudentProfilePage';
import { StudentClassPage } from './src/pages/student/StudentClassPage';
import { LandingPage } from './src/pages/landing/LandingPage';
import { AdminDashboardPage } from './src/pages/admin/AdminDashboardPage';
import { AdminClassesPage } from './src/pages/admin/AdminClassesPage';

const mockAuthValue: any = {
  role: 'ROLE_STUDENT',
  setRole: () => {},
  teacher: null,
  student: { id: 'std_1', fullName: 'Học sinh Test', email: 'test@gmail.com' },
  studentSession: { studentId: 'std_1', fullName: 'Học sinh Test', email: 'test@gmail.com', classId: 'class_1' },
  currentClass: { id: 'class_1', name: 'Lớp 10A1', classCode: 'TIN-7716' },
  isAuthenticatedStudent: true,
  isAuthenticatedTeacher: false,
  isLoading: false,
  loginTeacher: async () => {},
  loginTeacherWithGoogle: async () => {},
  logoutTeacher: async () => {},
  loginStudent: async () => {},
  loginStudentWithGoogle: async () => {},
  registerStudent: async () => {},
  logoutStudent: async () => {},
  updateStudentProfile: async () => {},
  setCurrentClass: () => {},
};

function renderPage(Comp: any, auth: any = mockAuthValue) {
  return renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          AuthContext.Provider,
          { value: auth },
          React.createElement(
            'div',
            { id: 'root' },
            React.createElement(
              'div',
              { className: 'min-h-screen' },
              React.createElement(
                'div',
                { className: 'flex-1' },
                React.createElement('main', null, React.createElement(Comp, null))
              )
            )
          )
        )
      )
    )
  );
}

// Polyfill for Node environment
if (typeof (globalThis as any).localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
  };
}
(globalThis as any).importMeta = { env: { VITE_GOOGLE_CLIENT_ID: '' } };
if (typeof (import.meta as any).env === 'undefined') {
  (import.meta as any).env = { VITE_GOOGLE_CLIENT_ID: '' };
}
interface DOMNode {
  tag: string;
  id?: string;
  classes?: string;
  attrs: Record<string, string>;
  children: DOMNode[];
  parent?: DOMNode;
  raw: string;
}

function parseHTML(html: string): DOMNode {
  const root: DOMNode = { tag: '#root', attrs: {}, children: [], raw: '' };
  let current = root;
  const stack: DOMNode[] = [root];

  const tagRegex = /<\/?([a-zA-Z0-9\-]+)([^>]*)>/g;
  let match;
  let lastIndex = 0;

  while ((match = tagRegex.exec(html)) !== null) {
    const isClosing = match[0].startsWith('</');
    const isSelfClosing = match[0].endsWith('/>') || ['input', 'img', 'br', 'hr', 'meta', 'link'].includes(match[1].toLowerCase());
    const tagName = match[1].toLowerCase();
    const rawAttrs = match[2];

    if (isClosing) {
      if (stack.length > 1) {
        stack.pop();
        current = stack[stack.length - 1];
      }
    } else {
      const attrs: Record<string, string> = {};
      const attrRegex = /([a-zA-Z0-9\-]+)(?:="([^"]*)")?/g;
      let aMatch;
      while ((aMatch = attrRegex.exec(rawAttrs)) !== null) {
        attrs[aMatch[1]] = aMatch[2] || '';
      }

      const node: DOMNode = {
        tag: tagName,
        id: attrs['id'],
        classes: attrs['class'],
        attrs,
        children: [],
        parent: current,
        raw: match[0],
      };
      current.children.push(node);

      if (!isSelfClosing) {
        stack.push(node);
        current = node;
      }
    }
  }

  return root;
}

function querySelectorPath(root: DOMNode, pathSteps: { tag: string; id?: string; nth?: number }[], debug = false): DOMNode | null {
  let candidates: DOMNode[] = [root];

  for (let i = 0; i < pathSteps.length; i++) {
    const step = pathSteps[i];
    let nextCandidates: DOMNode[] = [];
    for (const parent of candidates) {
      // Find matching children of same tag
      const matchingChildren = parent.children.filter(c => c.tag === step.tag);

      if (step.nth !== undefined) {
        const match = matchingChildren[step.nth - 1];
        if (match) {
          if (!step.id || match.id === step.id) {
            nextCandidates.push(match);
          }
        }
      } else {
        nextCandidates.push(...matchingChildren);
      }
    }
    if (debug) {
      console.log(`Step ${i} (${step.tag}:${step.nth}): matched ${nextCandidates.length} elements`);
      if (nextCandidates.length > 0) {
        console.log(`  -> classes: "${nextCandidates[0].classes || ''}", raw: ${nextCandidates[0].raw.slice(0, 60)}`);
      }
    }
    candidates = nextCandidates;
    if (candidates.length === 0) return null;
  }

  return candidates[0] || null;
}

// Selector:
// div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2)

const steps = [
  { tag: 'div', id: 'root', nth: 1 },
  { tag: 'div', nth: 1 },
  { tag: 'div', nth: 1 },
  { tag: 'main', nth: 1 },
  { tag: 'div', nth: 1 },
  { tag: 'div', nth: 1 },
  { tag: 'div', nth: 2 },
  { tag: 'div', nth: 2 },
  { tag: 'div', nth: 1 },
  { tag: 'div', nth: 1 },
  { tag: 'div', nth: 2 },
];

const pages = [
  { name: 'StudentDashboardPage', comp: StudentDashboardPage },
  { name: 'StudentLoginPage', comp: StudentLoginPage, auth: { ...mockAuthValue, isAuthenticatedStudent: false, student: null, studentSession: null } },
  { name: 'StudentRegisterPage', comp: StudentRegisterPage, auth: { ...mockAuthValue, isAuthenticatedStudent: false, student: null, studentSession: null } },
  { name: 'StudentProfilePage', comp: StudentProfilePage },
  { name: 'StudentClassPage', comp: StudentClassPage },
  { name: 'AdminDashboardPage', comp: AdminDashboardPage, auth: { ...mockAuthValue, role: 'ROLE_TEACHER', teacher: { id: 't1', fullName: 'Thầy Giáo' } } },
  { name: 'AdminClassesPage', comp: AdminClassesPage, auth: { ...mockAuthValue, role: 'ROLE_TEACHER', teacher: { id: 't1', fullName: 'Thầy Giáo' } } },
];

for (const p of pages) {
  try {
    const html = renderPage(p.comp, p.auth);
    const parsed = parseHTML(html);
    console.log(`\n=== Testing ${p.name} ===`);
    const found = querySelectorPath(parsed, steps, true);
    if (found) {
      console.log(`\n🎉 MATCH FOUND IN ${p.name}!`);
      console.log('Tag:', found.tag);
      console.log('ID:', found.id);
      console.log('Class:', found.classes);
      console.log('Raw:', found.raw);
      console.log('Children count:', found.children.length);
      console.log('Children tags:', found.children.map(c => c.tag + (c.classes ? '.' + c.classes.slice(0, 20) : '')));
    } else {
      console.log(`No match in ${p.name}`);
    }
  } catch (err: any) {
    console.error(`Error rendering ${p.name}:`, err.message);
  }
}

process.exit(0);
