import { createMessageComponent } from '~/components/chat/MessageComponents';

export interface ToolResponse {
  type: 'email' | 'calendar' | 'contact' | 'task';
  data: any;
  status: 'success' | 'error' | 'loading';
  timestamp: string;
  id: string;
}

export const parseEmailResponse = (data: any) => ({
  subject: data.subject || data.title || 'No Subject',
  from: data.from || data.sender || 'Unknown Sender',
  to: Array.isArray(data.to) ? data.to : [data.to].filter(Boolean),
  body: data.body || data.content || data.message || '',
  attachments: data.attachments || [],
});

export const parseCalendarResponse = (data: any) => ({
  title: data.title || data.summary || 'Untitled Event',
  start: new Date(data.start || data.startTime || data.startDate),
  end: new Date(data.end || data.endTime || data.endDate),
  attendees: Array.isArray(data.attendees) ? data.attendees : [data.attendees].filter(Boolean),
  location: data.location || data.venue || undefined,
  description: data.description || data.details || undefined,
});

export const parseContactResponse = (data: any) => ({
  name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown Contact',
  email: Array.isArray(data.email) ? data.email : [data.email].filter(Boolean),
  phone: Array.isArray(data.phone) ? data.phone : [data.phone].filter(Boolean),
  company: data.company || data.organization || undefined,
  title: data.title || data.jobTitle || undefined,
});

export const parseTaskResponse = (data: any) => ({
  title: data.title || data.name || 'Untitled Task',
  dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
  status: data.status || 'pending',
  notes: data.notes || data.description || undefined,
  list: data.list || data.category || 'Default',
});

export const parseToolResponse = (response: ToolResponse) => {
  const { type, data, status, timestamp, id } = response;

  let parsedData;
  switch (type) {
    case 'email':
      parsedData = parseEmailResponse(data);
      break;
    case 'calendar':
      parsedData = parseCalendarResponse(data);
      break;
    case 'contact':
      parsedData = parseContactResponse(data);
      break;
    case 'task':
      parsedData = parseTaskResponse(data);
      break;
    default:
      console.warn(`Unknown response type: ${type}`);
      return null;
  }

  return createMessageComponent(type, {
    id,
    timestamp,
    status,
    data: parsedData,
  });
};

export const parseToolResponses = (responses: ToolResponse[]) => {
  return responses.map(response => parseToolResponse(response)).filter(Boolean);
}; 