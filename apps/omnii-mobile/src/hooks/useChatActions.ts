import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTaskMutations } from '~/hooks/useTasks';

export const useChatActions = () => {
  const router = useRouter();
  const {
    createTask,
    updateTask,
    deleteTask,
    createTaskList,
    createTaskInFirstList,
    markTaskCompleted,
    markTaskIncomplete
  } = useTaskMutations();

  const handleTaskAction = useCallback(async (action: string, data: any) => {
    console.log('[Chat] Task action:', action, data);
    
    try {
      switch (action) {
        case 'navigate_to_profile_connect':
          router.push('/(tabs)/profile?tab=connect');
          break;

        case 'create_task':
          const taskTitle = prompt('Enter task title:') || `New Task ${new Date().toLocaleTimeString()}`;
          const taskNotes = prompt('Enter task notes (optional):') || '';
          await createTaskInFirstList(taskTitle, taskNotes);
          console.log('[Chat] ✅ Task created successfully');
          break;

        case 'create_task_in_list':
          if (data?.listId && data?.title) {
            await createTask({
              tasklist: data.listId,
              title: data.title,
              notes: data.notes || '',
              status: 'needsAction',
              due: data.due || undefined
            });
            console.log('[Chat] ✅ Task created in list successfully');
          }
          break;

        case 'create_task_list':
          if (data?.title) {
            await createTaskList({ title: data.title });
          } else {
            const listTitle = prompt('Enter task list title:') || `New List ${new Date().toLocaleTimeString()}`;
            await createTaskList({ title: listTitle });
          }
          console.log('[Chat] ✅ Task list created successfully');
          break;

        case 'mark_complete':
          if (data?.task && data?.listId) {
            await markTaskCompleted(data.listId, data.task.id);
            console.log('[Chat] ✅ Task marked as completed');
          }
          break;

        case 'mark_incomplete':
          if (data?.task && data?.listId) {
            await markTaskIncomplete(data.listId, data.task.id);
            console.log('[Chat] ✅ Task marked as incomplete');
          }
          break;

        case 'edit_task':
          if (data?.task && data?.listId) {
            // Support both prompt-based and inline editing
            const newTitle = data.newTitle || prompt('Edit task title:', data.task.title) || data.task.title;
            const newNotes = data.newNotes !== undefined ? data.newNotes : (prompt('Edit task notes:', data.task.notes || '') || data.task.notes);
            
            await updateTask({
              tasklist: data.listId,
              task: data.task.id,
              title: newTitle,
              notes: newNotes
            });
            console.log('[Chat] ✅ Task updated successfully');
          }
          break;

        case 'delete_task':
          if (data?.task && data?.listId) {
            // For mobile, we'll delete immediately since the user has to explicitly tap the delete option
            await deleteTask({
              tasklist: data.listId,
              task: data.task.id
            });
            console.log('[Chat] ✅ Task deleted successfully');
          }
          break;

        case 'create_subtask':
          if (data?.parentTask && data?.listId) {
            const subtaskTitle = prompt('Enter subtask title:') || `Subtask of ${data.parentTask.title}`;
            const subtaskNotes = prompt('Enter subtask notes (optional):') || '';
            const dueDays = prompt('Due in how many days? (leave empty for no due date)');
            
            let dueDate = undefined;
            if (dueDays && !isNaN(parseInt(dueDays))) {
              const due = new Date();
              due.setDate(due.getDate() + parseInt(dueDays));
              dueDate = due.toISOString();
            }
            
            await createTask({
              tasklist: data.listId,
              title: subtaskTitle,
              notes: subtaskNotes,
              status: 'needsAction',
              parent: data.parentTask.id,
              due: dueDate
            });
            console.log('[Chat] ✅ Subtask created successfully');
          }
          break;

        case 'set_due_date':
          if (data?.task && data?.listId) {
            // If dueDate is provided directly (from DateTimePicker)
            if (data.dueDate) {
              await updateTask({
                tasklist: data.listId,
                task: data.task.id,
                due: data.dueDate
              });
              console.log('[Chat] ✅ Due date updated successfully');
            } else {
              // Fallback to prompt for non-datepicker scenarios
              const dueDays = prompt('Due in how many days? (0 for today, leave empty to remove)', 
                data.task.due ? `Currently due: ${new Date(data.task.due).toLocaleDateString()}` : undefined);
              
              let dueDate = undefined;
              if (dueDays !== null && dueDays !== '') {
                if (!isNaN(parseInt(dueDays))) {
                  const due = new Date();
                  due.setDate(due.getDate() + parseInt(dueDays));
                  dueDate = due.toISOString();
                }
              }
              
              await updateTask({
                tasklist: data.listId,
                task: data.task.id,
                due: dueDate
              });
              console.log('[Chat] ✅ Due date updated successfully');
            }
          }
          break;

        case 'clear_due_date':
          if (data?.task && data?.listId) {
            await updateTask({
              tasklist: data.listId,
              task: data.task.id,
              due: null
            });
            console.log('[Chat] ✅ Due date cleared successfully');
          }
          break;

        case 'create_subtask_detailed':
          if (data?.parentTask && data?.listId) {
            await createTask({
              tasklist: data.listId,
              title: data.title,
              notes: data.notes || '',
              status: 'needsAction',
              parent: data.parentTask.id,
              due: data.due || undefined
            });
            console.log('[Chat] ✅ Subtask created successfully');
          }
          break;

        default:
          console.log('[Chat] ❓ Unhandled task action:', action, data);
          break;
      }
    } catch (error) {
      console.error('[Chat] ❌ Task action failed:', action, error);
      Alert.alert('Error', `Failed to ${action.replace(/_/g, ' ')}`);
    }
  }, [router, createTask, updateTask, deleteTask, createTaskList, createTaskInFirstList, markTaskCompleted, markTaskIncomplete]);

  const handleCalendarAction = useCallback((action: string, data: any) => {
    console.log('[Chat] Calendar action:', action, data);
    
    switch (action) {
      case 'view_event':
        console.log('[Chat] View calendar event:', data);
        break;
      case 'edit_event':
        console.log('[Chat] Edit calendar event:', data);
        break;
      case 'join_meeting':
        console.log('[Chat] Join meeting:', data?.meetingLink);
        break;
      case 'create_event':
        console.log('[Chat] Create new calendar event');
        break;
      case 'view_calendar':
        console.log('[Chat] Open calendar app');
        break;
      default:
        console.log('[Chat] Unhandled calendar action:', action, data);
    }
  }, []);

  const handleContactAction = useCallback((action: string, data: any) => {
    console.log('[Chat] Contact action:', action, data);
    
    switch (action) {
      case 'contact_selected':
        console.log('[Chat] Contact selected:', data?.contact);
        // Could navigate to contact detail view or open messaging app
        break;
      case 'view_all_contacts':
        console.log('[Chat] View all contacts');
        // Could navigate to contacts list view
        break;
      case 'search_contacts':
        console.log('[Chat] Search contacts:', data?.query);
        break;
      case 'call_contact':
        console.log('[Chat] Call contact:', data?.contact);
        // Could integrate with phone dialer
        break;
      case 'email_contact':
        console.log('[Chat] Email contact:', data?.contact);
        // Could integrate with email app
        break;
      default:
        console.log('[Chat] Unhandled contact action:', action, data);
    }
  }, []);

  const handleEmailAction = useCallback((action: string, data: any) => {
    console.log('[Chat] Email action:', action, data);
    
    switch (action) {
      case 'email_selected':
        console.log('[Chat] Email selected:', data?.email);
        // Could navigate to email detail view or open email app
        break;
      case 'view_all_emails':
        console.log('[Chat] View all emails');
        // Could navigate to emails list view
        break;
      case 'reply_email':
        console.log('[Chat] Reply to email:', data?.email);
        // Could open compose with reply content
        break;
      case 'forward_email':
        console.log('[Chat] Forward email:', data?.email);
        // Could open compose with forward content
        break;
      case 'mark_read':
        console.log('[Chat] Mark email as read:', data?.email);
        // Could integrate with Gmail API to mark as read
        break;
      case 'mark_unread':
        console.log('[Chat] Mark email as unread:', data?.email);
        // Could integrate with Gmail API to mark as unread
        break;
      case 'archive_email':
        console.log('[Chat] Archive email:', data?.email);
        // Could integrate with Gmail API to archive
        break;
      case 'search_emails':
        console.log('[Chat] Search emails:', data?.query);
        break;
      default:
        console.log('[Chat] Unhandled email action:', action, data);
    }
  }, []);

  return {
    handleTaskAction,
    handleCalendarAction,
    handleContactAction,
    handleEmailAction
  };
};