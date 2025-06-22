// Neo4j Services
export { Neo4jDirectService } from './direct.service';

// Create and export singleton instance
import { Neo4jDirectService } from './direct.service';
export const neo4jDirectService = new Neo4jDirectService(); 