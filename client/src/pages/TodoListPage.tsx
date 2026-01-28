import { useState, useEffect } from 'react';
import './TodoListPage.css';
import { todoAPI } from '../services/api';
import type { User } from '../types/user';
import type { Todo } from '../types/todo';

type TodoListPageProps = {
  user: User;
};

export function TodoListPage({ user }: TodoListPageProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTodo, setEditTodo] = useState({
    title: '',
    period: '오전',
    hour: '9',
    minute: '00',
    content: '',
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTodo, setNewTodo] = useState({
    title: '',
    period: '오전',
    hour: '9',
    minute: '00',
    content: '',
  });

  useEffect(() => {
    loadTodos();
  }, [user.userId]);

  const parseTimeToMinutes = (timeString: string): number => {
    const match = timeString.match(/(오전|오후)\s*(\d+)시\s*(\d+)분/);
    if (!match) return 0;

    const period = match[1];
    const hour = parseInt(match[2]);
    const minute = parseInt(match[3]);

    let totalMinutes = hour * 60 + minute;
    if (period === '오후' && hour !== 12) {
      totalMinutes += 12 * 60;
    } else if (period === '오전' && hour === 12) {
      totalMinutes = minute; // 오전 12시는 0시
    }

    return totalMinutes;
  };

  const sortTodosByTime = (todos: Todo[]): Todo[] => {
    return [...todos].sort((a, b) => {
      const timeA = parseTimeToMinutes(a.time);
      const timeB = parseTimeToMinutes(b.time);
      return timeA - timeB;
    });
  };

  const loadTodos = async () => {
    try {
      setLoading(true);
      const data = await todoAPI.getTodos(user.userId);
      const sortedData = sortTodosByTime(data);
      setTodos(sortedData);
      setError('');
    } catch (err) {
      setError('Todo 목록을 불러오는데 실패했습니다');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTodo = async () => {
    if (!newTodo.title || !newTodo.hour || !newTodo.content) {
      setError('모든 항목을 입력해주세요');
      return;
    }

    const timeString = `${newTodo.period} ${newTodo.hour}시 ${newTodo.minute}분`;

    try {
      await todoAPI.createTodo(
        user.userId,
        newTodo.title,
        timeString,
        newTodo.content,
      );
      setNewTodo({
        title: '',
        period: '오전',
        hour: '9',
        minute: '00',
        content: '',
      });
      setShowAddModal(false);
      setError('');
      loadTodos();
    } catch (err) {
      setError('Todo 추가에 실패했습니다');
      console.error(err);
    }
  };

  const handleToggleTodo = async (todoId: string) => {
    try {
      await todoAPI.toggleTodo(todoId);
      loadTodos();
    } catch (err) {
      setError('Todo 상태 변경에 실패했습니다');
      console.error(err);
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) {
      return;
    }

    try {
      await todoAPI.deleteTodo(todoId);
      setSelectedTodo(null);
      loadTodos();
    } catch (err) {
      setError('Todo 삭제에 실패했습니다');
      console.error(err);
    }
  };

  const handleEditClick = () => {
    if (selectedTodo) {
      const timeParts = selectedTodo.time.match(
        /(오전|오후)\s*(\d+)시\s*(\d+)분/,
      );
      const period = timeParts?.[1] || '오전';
      const hour = timeParts?.[2] || '9';
      const minute = timeParts?.[3] || '00';

      setEditTodo({
        title: selectedTodo.title,
        period,
        hour,
        minute,
        content: selectedTodo.content,
      });
      setIsEditMode(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditTodo({
      title: '',
      period: '오전',
      hour: '9',
      minute: '00',
      content: '',
    });
  };

  const handleUpdateTodo = async () => {
    if (
      !selectedTodo ||
      !editTodo.title ||
      !editTodo.hour ||
      !editTodo.content
    ) {
      setError('모든 항목을 입력해주세요');
      return;
    }

    const timeString = `${editTodo.period} ${editTodo.hour}시 ${editTodo.minute}분`;

    try {
      await todoAPI.updateTodo(
        selectedTodo._id,
        editTodo.title,
        timeString,
        editTodo.content,
      );
      setIsEditMode(false);
      setSelectedTodo(null);
      setError('');
      loadTodos();
    } catch (err) {
      setError('Todo 수정에 실패했습니다');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="todo-loading">로딩 중...</div>;
  }

  const completedCount = todos.filter((todo) => todo.completed).length;
  const totalCount = todos.length;

  return (
    <div className="todo-page">
      <div className="todo-header">
        <h2 className="todo-title">TODO-LIST</h2>
        <div className="todo-stats">
          <span className="completed-count">{completedCount}</span>
          <span className="stats-separator"> / </span>
          <span className="total-count">{totalCount}</span>
        </div>
        <button
          className="add-todo-button"
          onClick={() => setShowAddModal(true)}
        >
          + 추가
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="todo-list">
        {todos.length === 0 ? (
          <p className="empty-message">등록된 Todo가 없습니다</p>
        ) : (
          todos.map((todo) => (
            <div
              key={todo._id}
              className={`todo-item ${todo.completed ? 'completed' : ''}`}
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => handleToggleTodo(todo._id)}
                className="todo-checkbox"
              />
              <span
                className="todo-item-title"
                onClick={() => setSelectedTodo(todo)}
              >
                {todo.title}
              </span>
              <span className="todo-time" onClick={() => setSelectedTodo(todo)}>
                {todo.time}
              </span>
            </div>
          ))
        )}
      </div>

      {/* 상세보기 모달 */}
      {selectedTodo && (
        <div
          className="modal-overlay"
          onClick={() => {
            setSelectedTodo(null);
            setIsEditMode(false);
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Todo {isEditMode ? '수정' : '상세'}</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setSelectedTodo(null);
                  setIsEditMode(false);
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {isEditMode ? (
                // 수정 모드
                <>
                  <div className="form-group">
                    <label>제목</label>
                    <input
                      type="text"
                      value={editTodo.title}
                      onChange={(e) =>
                        setEditTodo({ ...editTodo, title: e.target.value })
                      }
                      placeholder="제목을 입력하세요"
                    />
                  </div>
                  <div className="form-group">
                    <label>시간</label>
                    <div className="time-input-group">
                      <select
                        value={editTodo.period}
                        onChange={(e) =>
                          setEditTodo({ ...editTodo, period: e.target.value })
                        }
                        className="period-select"
                      >
                        <option value="오전">오전</option>
                        <option value="오후">오후</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        max="11"
                        value={editTodo.hour}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (
                            value === '' ||
                            (parseInt(value) >= 0 && parseInt(value) <= 11)
                          ) {
                            setEditTodo({ ...editTodo, hour: value });
                          }
                        }}
                        placeholder="0-11"
                        className="hour-input"
                      />
                      <span className="hour-label">시</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={editTodo.minute}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (
                            value === '' ||
                            (parseInt(value) >= 0 && parseInt(value) <= 59)
                          ) {
                            setEditTodo({ ...editTodo, minute: value });
                          }
                        }}
                        placeholder="00-59"
                        className="minute-input"
                      />
                      <span className="minute-label">분</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>내용</label>
                    <textarea
                      value={editTodo.content}
                      onChange={(e) =>
                        setEditTodo({ ...editTodo, content: e.target.value })
                      }
                      placeholder="내용을 입력하세요"
                      rows={5}
                    />
                  </div>
                </>
              ) : (
                // 보기 모드
                <>
                  <div className="detail-item">
                    <label>제목</label>
                    <p>{selectedTodo.title}</p>
                  </div>
                  <div className="detail-item">
                    <label>시간</label>
                    <p>{selectedTodo.time}</p>
                  </div>
                  <div className="detail-item">
                    <label>내용</label>
                    <p className="detail-content">{selectedTodo.content}</p>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              {isEditMode ? (
                <>
                  <button className="cancel-button" onClick={handleCancelEdit}>
                    취소
                  </button>
                  <button className="submit-button" onClick={handleUpdateTodo}>
                    저장
                  </button>
                </>
              ) : (
                <>
                  <button className="edit-button" onClick={handleEditClick}>
                    수정
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteTodo(selectedTodo._id)}
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 추가 모달 */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Todo 추가</h3>
              <button
                className="modal-close"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>제목</label>
                <input
                  type="text"
                  value={newTodo.title}
                  onChange={(e) =>
                    setNewTodo({ ...newTodo, title: e.target.value })
                  }
                  placeholder="제목을 입력하세요"
                />
              </div>
              <div className="form-group">
                <label>시간</label>
                <div className="time-input-group">
                  <select
                    value={newTodo.period}
                    onChange={(e) =>
                      setNewTodo({ ...newTodo, period: e.target.value })
                    }
                    className="period-select"
                  >
                    <option value="오전">오전</option>
                    <option value="오후">오후</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    max="11"
                    value={newTodo.hour}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (
                        value === '' ||
                        (parseInt(value) >= 0 && parseInt(value) <= 11)
                      ) {
                        setNewTodo({ ...newTodo, hour: value });
                      }
                    }}
                    placeholder="0-11"
                    className="hour-input"
                  />
                  <span className="hour-label">시</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={newTodo.minute}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (
                        value === '' ||
                        (parseInt(value) >= 0 && parseInt(value) <= 59)
                      ) {
                        setNewTodo({ ...newTodo, minute: value });
                      }
                    }}
                    placeholder="00-59"
                    className="minute-input"
                  />
                  <span className="minute-label">분</span>
                </div>
              </div>
              <div className="form-group">
                <label>내용</label>
                <textarea
                  value={newTodo.content}
                  onChange={(e) =>
                    setNewTodo({ ...newTodo, content: e.target.value })
                  }
                  placeholder="내용을 입력하세요"
                  rows={5}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="submit-button" onClick={handleAddTodo}>
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
