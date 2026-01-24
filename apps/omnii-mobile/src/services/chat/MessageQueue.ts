import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueuedMessage } from '~/types/chat-service.types';

export class MessageQueue {
  private static QUEUE_KEY = 'omnii_chat_message_queue';
  private static MAX_RETRIES = 3;
  private static MAX_QUEUE_SIZE = 100; // Prevent unbounded growth
  
  static async add(message: Omit<QueuedMessage, 'retryCount'>): Promise<void> {
    const queue = await this.getQueue();
    
    // Remove old messages if queue is too large
    if (queue.length >= this.MAX_QUEUE_SIZE) {
      queue.shift(); // Remove oldest
    }
    
    queue.push({ ...message, retryCount: 0 });
    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
  }
  
  static async getQueue(): Promise<QueuedMessage[]> {
    try {
      const data = await AsyncStorage.getItem(this.QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }
  
  static async remove(messageId: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter(m => m.id !== messageId);
    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(filtered));
  }
  
  static async incrementRetry(messageId: string): Promise<boolean> {
    const queue = await this.getQueue();
    const message = queue.find(m => m.id === messageId);
    
    if (!message) return false;
    
    message.retryCount++;
    
    if (message.retryCount > this.MAX_RETRIES) {
      await this.remove(messageId);
      return false;
    }
    
    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    return true;
  }
  
  static async clear(): Promise<void> {
    await AsyncStorage.removeItem(this.QUEUE_KEY);
  }
  
  static async getOldestMessage(): Promise<QueuedMessage | null> {
    const queue = await this.getQueue();
    return queue.length > 0 ? queue[0] : null;
  }
  
  static async getFailedMessages(): Promise<QueuedMessage[]> {
    const queue = await this.getQueue();
    return queue.filter(m => m.retryCount >= this.MAX_RETRIES);
  }
}