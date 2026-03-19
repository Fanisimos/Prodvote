import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { useTasks, QUADRANTS, Quadrant, Task } from '../../hooks/useTasks';
import Colors from '../../constants/Colors';
import { useTheme } from '../../lib/ThemeContext';

function QuadrantCard({
  quadrant,
  tasks,
  onToggle,
  onDelete,
  onMove,
  onPress,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  colors,
}: {
  quadrant: Quadrant;
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string) => void;
  onPress: () => void;
  onAddSubtask: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
  colors: any;
}) {
  const styles = getStyles(colors);
  const q = QUADRANTS[quadrant];
  const active = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <View style={[styles.quadrantCard, { borderColor: q.color + '30', backgroundColor: q.bg }]}>
      <TouchableOpacity style={styles.quadrantHeader} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.quadrantTitleRow}>
          <View style={[styles.quadrantDot, { backgroundColor: q.color, shadowColor: q.color }]} />
          <View>
            <Text style={[styles.quadrantName, { color: q.color }]}>{q.label}</Text>
            <Text style={styles.quadrantSubtitle}>{q.subtitle}</Text>
          </View>
        </View>
        <View style={[styles.countBadge, { backgroundColor: q.color + '22' }]}>
          <Text style={[styles.countText, { color: q.color }]}>{active.length}</Text>
        </View>
      </TouchableOpacity>

      {active.map(task => (
        <View key={task.id}>
          <View style={styles.taskRow}>
            <TouchableOpacity onPress={() => onToggle(task.id)} style={styles.checkbox}>
              <View style={[styles.checkboxInner, { borderColor: q.color + '66' }]} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.taskTextWrap}
              onPress={() => setExpanded(expanded === task.id ? null : task.id)}
            >
              <Text style={styles.taskText}>{task.text}</Text>
              {task.subtasks.length > 0 && (
                <Text style={styles.subtaskCount}>
                  {task.subtasks.filter(s => s.done).length}/{task.subtasks.length}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onMove(task.id)} style={styles.moveBtn}>
              <Text style={styles.moveBtnText}>↗</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS === 'web') {
                  onDelete(task.id);
                } else {
                  Alert.alert('Delete Task', `Delete "${task.text}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => onDelete(task.id) },
                  ]);
                }
              }}
              style={styles.deleteBtn}
            >
              <Text style={styles.deleteBtnText}>×</Text>
            </TouchableOpacity>
          </View>

          {expanded === task.id && (
            <View style={styles.subtaskSection}>
              {task.subtasks.map(sub => (
                <View key={sub.id} style={styles.subtaskRow}>
                  <TouchableOpacity onPress={() => onToggleSubtask(task.id, sub.id)}>
                    <Text style={sub.done ? styles.subtaskDone : styles.subtaskText}>
                      {sub.done ? '☑' : '☐'} {sub.text}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onDeleteSubtask(task.id, sub.id)}>
                    <Text style={styles.subtaskDelete}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={() => onAddSubtask(task.id)} style={styles.addSubtaskBtn}>
                <Text style={[styles.addSubtaskText, { color: q.color }]}>+ subtask</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}

      {done.length > 0 && (
        <View style={styles.doneSection}>
          <Text style={styles.doneLabel}>{done.length} completed</Text>
          {done.slice(0, 3).map(task => (
            <View key={task.id} style={styles.taskRow}>
              <TouchableOpacity onPress={() => onToggle(task.id)} style={styles.checkbox}>
                <View style={[styles.checkboxInner, styles.checkboxDone, { borderColor: q.color, backgroundColor: q.color }]}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.taskTextDone}>{task.text}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function TasksScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const {
    stats,
    loaded,
    addTask,
    toggleTask,
    deleteTask,
    moveTask,
    getTasksByQuadrant,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
  } = useTasks();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState<string | null>(null);
  const [selectedQuadrant, setSelectedQuadrant] = useState<Quadrant>('do');
  const [newTaskText, setNewTaskText] = useState('');
  const [subtaskInput, setSubtaskInput] = useState<{ taskId: string; visible: boolean }>({ taskId: '', visible: false });
  const [subtaskText, setSubtaskText] = useState('');
  const inputRef = useRef<TextInput>(null);

  function handleAddTask() {
    if (!newTaskText.trim()) return;
    addTask(newTaskText.trim(), selectedQuadrant);
    setNewTaskText('');
    setShowAddModal(false);
  }

  function handleMove(taskId: string) {
    setShowMoveModal(taskId);
  }

  function confirmMove(quadrant: Quadrant) {
    if (showMoveModal) {
      moveTask(showMoveModal, quadrant);
      setShowMoveModal(null);
    }
  }

  function handleAddSubtask(taskId: string) {
    setSubtaskInput({ taskId, visible: true });
    setSubtaskText('');
  }

  function confirmSubtask() {
    if (subtaskText.trim() && subtaskInput.taskId) {
      addSubtask(subtaskInput.taskId, subtaskText.trim());
      setSubtaskText('');
      setSubtaskInput({ taskId: '', visible: false });
    }
  }

  if (!loaded) return null;

  return (
    <View style={styles.container}>
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.done}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: '#ffb347' }]}>
            {stats.streak > 0 ? `🔥 ${stats.streak}` : '0'}
          </Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {(['do', 'schedule', 'delegate', 'eliminate'] as Quadrant[]).map(q => (
          <QuadrantCard
            key={q}
            quadrant={q}
            tasks={getTasksByQuadrant(q)}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onMove={handleMove}
            onPress={() => { setSelectedQuadrant(q); setShowAddModal(true); }}
            onAddSubtask={handleAddSubtask}
            onToggleSubtask={toggleSubtask}
            onDeleteSubtask={deleteSubtask}
            colors={colors}
          />
        ))}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => { setSelectedQuadrant('do'); setShowAddModal(true); }}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add Task Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>New Task</Text>

            <TextInput
              ref={inputRef}
              style={styles.modalInput}
              placeholder="What needs to be done?"
              placeholderTextColor="#64748b"
              value={newTaskText}
              onChangeText={setNewTaskText}
              autoFocus
              onSubmitEditing={handleAddTask}
              returnKeyType="done"
            />

            <Text style={styles.modalLabel}>QUADRANT</Text>
            <View style={styles.quadrantPicker}>
              {(['do', 'schedule', 'delegate', 'eliminate'] as Quadrant[]).map(q => (
                <TouchableOpacity
                  key={q}
                  style={[
                    styles.quadrantOption,
                    selectedQuadrant === q && { backgroundColor: QUADRANTS[q].color + '22', borderColor: QUADRANTS[q].color },
                  ]}
                  onPress={() => setSelectedQuadrant(q)}
                >
                  <View style={[styles.optionDot, { backgroundColor: QUADRANTS[q].color }]} />
                  <Text style={[styles.optionText, selectedQuadrant === q && { color: QUADRANTS[q].color }]}>
                    {QUADRANTS[q].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.modalButton} onPress={handleAddTask}>
              <Text style={styles.modalButtonText}>Add Task</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Move Task Modal */}
      <Modal visible={showMoveModal !== null} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowMoveModal(null)}>
          <Pressable style={styles.moveModalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Move to</Text>
            {(['do', 'schedule', 'delegate', 'eliminate'] as Quadrant[]).map(q => (
              <TouchableOpacity key={q} style={styles.moveOption} onPress={() => confirmMove(q)}>
                <View style={[styles.optionDot, { backgroundColor: QUADRANTS[q].color }]} />
                <View>
                  <Text style={[styles.moveOptionText, { color: QUADRANTS[q].color }]}>{QUADRANTS[q].label}</Text>
                  <Text style={styles.moveOptionSub}>{QUADRANTS[q].subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add Subtask Modal */}
      <Modal visible={subtaskInput.visible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setSubtaskInput({ taskId: '', visible: false })}>
          <Pressable style={styles.moveModalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Add Subtask</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Subtask..."
              placeholderTextColor="#64748b"
              value={subtaskText}
              onChangeText={setSubtaskText}
              autoFocus
              onSubmitEditing={confirmSubtask}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.modalButton} onPress={confirmSubtask}>
              <Text style={styles.modalButtonText}>Add</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    statsBar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    stat: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '800',
      color: Colors.primary,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statDivider: {
      width: 1,
      backgroundColor: colors.surfaceBorder,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 100,
    },
    quadrantCard: {
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 14,
      overflow: 'hidden',
    },
    quadrantHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      paddingBottom: 12,
    },
    quadrantTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    quadrantDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
      elevation: 4,
    },
    quadrantName: {
      fontSize: 16,
      fontWeight: '700',
    },
    quadrantSubtitle: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    countBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    countText: {
      fontSize: 14,
      fontWeight: '800',
    },
    taskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.04)',
    },
    checkbox: {
      marginRight: 12,
    },
    checkboxInner: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
    },
    checkboxDone: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkmark: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '800',
    },
    taskTextWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    taskText: {
      fontSize: 15,
      color: colors.text,
      flex: 1,
    },
    taskTextDone: {
      fontSize: 14,
      color: colors.textSecondary,
      textDecorationLine: 'line-through',
      flex: 1,
      opacity: 0.6,
    },
    subtaskCount: {
      fontSize: 11,
      color: colors.textSecondary,
      backgroundColor: colors.surface,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    moveBtn: {
      padding: 6,
      marginLeft: 4,
    },
    moveBtnText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    deleteBtn: {
      padding: 6,
      marginLeft: 2,
    },
    deleteBtnText: {
      fontSize: 20,
      color: colors.textSecondary,
      fontWeight: '300',
    },
    subtaskSection: {
      paddingLeft: 50,
      paddingRight: 16,
      paddingBottom: 8,
    },
    subtaskRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    subtaskText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    subtaskDone: {
      fontSize: 13,
      color: colors.textSecondary,
      opacity: 0.5,
      textDecorationLine: 'line-through',
    },
    subtaskDelete: {
      fontSize: 16,
      color: colors.textSecondary,
      opacity: 0.5,
      paddingHorizontal: 8,
    },
    addSubtaskBtn: {
      paddingVertical: 6,
    },
    addSubtaskText: {
      fontSize: 12,
      fontWeight: '600',
    },
    doneSection: {
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.04)',
      paddingTop: 4,
    },
    doneLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: '600',
      opacity: 0.6,
    },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: Colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    fabText: {
      fontSize: 28,
      color: '#fff',
      fontWeight: '400',
      marginTop: -2,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderBottomWidth: 0,
    },
    moveModalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderBottomWidth: 0,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 20,
    },
    modalLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 10,
      marginTop: 20,
      letterSpacing: 1,
    },
    modalInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.text,
    },
    quadrantPicker: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    quadrantOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    optionDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    optionText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    moveOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
    },
    moveOptionText: {
      fontSize: 16,
      fontWeight: '600',
    },
    moveOptionSub: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    modalButton: {
      backgroundColor: Colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 20,
    },
    modalButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
