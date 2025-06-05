import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Link } from 'expo-router';
import { ChevronLeft, Calendar, Clock, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Circle as XCircle } from 'lucide-react-native';
import { useAuth } from '~/context/AuthContext';
import { useRequestDetails } from '~/hooks/useRequestDetails';
import { formatDate } from '~/utils/formatters';

export default function RequestDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  
  const { request, isLoading, processRequest } = useRequestDetails(id);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E5E5',
    },
    backButton: {
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#000000',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    priorityBadge: {
      paddingVertical: 4,
      paddingHorizontal: 12,
      borderRadius: 16,
      alignSelf: 'flex-start',
      marginBottom: 16,
    },
    priorityText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: '#000000',
      marginBottom: 16,
    },
    metaContainer: {
      flexDirection: 'row',
      marginBottom: 24,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 24,
    },
    metaText: {
      marginLeft: 4,
      color: '#666666',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#000000',
      marginBottom: 12,
      marginTop: 24,
    },
    descriptionText: {
      fontSize: 16,
      lineHeight: 24,
      color: '#000000',
    },
    infoCard: {
      backgroundColor: '#F5F5F5',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E5E5',
    },
    infoLabel: {
      fontSize: 14,
      color: '#666666',
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '500',
      color: '#000000',
    },
    lastInfoRow: {
      borderBottomWidth: 0,
      marginBottom: 0,
      paddingBottom: 0,
    },
    commentContainer: {
      marginTop: 24,
      marginBottom: 16,
    },
    commentInput: {
      backgroundColor: '#F5F5F5',
      borderWidth: 1,
      borderColor: '#E5E5E5',
      borderRadius: 8,
      padding: 16,
      fontSize: 16,
      color: '#000000',
      height: 120,
      textAlignVertical: 'top',
      marginBottom: 16,
    },
    actionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
      marginBottom: 32,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    approveButton: {
      backgroundColor: '#34C759',
      marginRight: 8,
    },
    declineButton: {
      backgroundColor: '#FF3B30',
      marginLeft: 8,
    },
    actionButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    emptyText: {
      fontSize: 16,
      color: '#666666',
      textAlign: 'center',
      marginTop: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  const handleApprove = async () => {
    processRequest('approve', comment);
  };

  const handleDecline = async () => {
    // Direct decline action - no confirmation needed
    processRequest('decline', comment);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Details</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Details</Text>
        </View>
        <View style={styles.emptyContainer}>
          <AlertCircle size={48} color="#666666" />
          <Text style={styles.emptyText}>Request not found or you don't have permission to view it.</Text>
          <Link href="/(tabs)/approvals" asChild>
            <TouchableOpacity style={[styles.actionButton, styles.approveButton, { marginTop: 24 }]}>
              <Text style={styles.actionButtonText}>Go to Approvals</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  // Determine badge colors based on priority
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return '#FF3B30';
      case 'medium': return '#FF9500';
      case 'low': return '#34C759';
      default: return '#007AFF';
    }
  };

  // Check if request is already processed
  const isProcessed = request.status === 'approved' || request.status === 'declined';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Details</Text>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[
          styles.priorityBadge, 
          { backgroundColor: getPriorityColor(request.priority) }
        ]}>
          <Text style={styles.priorityText}>
            {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)} Priority
          </Text>
        </View>
        
        <Text style={styles.title}>{request.title}</Text>
        
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Calendar size={16} color="#666666" />
            <Text style={styles.metaText}>{formatDate(request.created_at)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={16} color="#666666" />
            <Text style={styles.metaText}>{request.created_at.split('T')[1].substring(0, 5)}</Text>
          </View>
        </View>
        
        {isProcessed && (
          <View style={[
            styles.infoCard, 
            { 
              backgroundColor: request.status === 'approved' 
                ? '#E8F5E9'
                : '#FFEBEE'
            }
          ]}>
            <View style={[styles.metaItem, { marginBottom: 0 }]}>
              {request.status === 'approved' ? (
                <CheckCircle size={20} color="#34C759" />
              ) : (
                <XCircle size={20} color="#FF3B30" />
              )}
              <Text style={[
                styles.metaText, 
                { 
                  color: request.status === 'approved' 
                    ? '#34C759'
                    : '#FF3B30',
                  fontWeight: '600',
                  marginLeft: 8
                }
              ]}>
                {request.status === 'approved' ? 'Approved' : 'Declined'} on {formatDate(request.processed_at)}
              </Text>
            </View>
          </View>
        )}
        
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.descriptionText}>{request.description}</Text>
        
        <Text style={styles.sectionTitle}>Request Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Workflow ID</Text>
            <Text style={styles.infoValue}>{request.workflow_id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Requested By</Text>
            <Text style={styles.infoValue}>{request.requested_by}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type</Text>
            <Text style={styles.infoValue}>{request.type}</Text>
          </View>
          <View style={[styles.infoRow, styles.lastInfoRow]}>
            <Text style={styles.infoLabel}>Department</Text>
            <Text style={styles.infoValue}>{request.department}</Text>
          </View>
        </View>

        {!isProcessed && (
          <>
            <Text style={styles.sectionTitle}>Your Comment</Text>
            <View style={styles.commentContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add an optional comment about your decision..."
                placeholderTextColor="#999999"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
              />
            </View>
            
            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.approveButton]}
                onPress={handleApprove}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.declineButton]}
                onPress={handleDecline}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <XCircle size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Decline</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}