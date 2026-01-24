# OMNII Data Retention Policy

**Effective Date**: May 30, 2025  
**Last Updated**: May 30, 2025  
**Version**: 1.0

## 1. Introduction

This Data Retention Policy explains how long OMNII Technologies ("we," "our," or "us") retains different types of data collected through the OMNII mobile application ("App"). This policy supports our Privacy Policy and ensures compliance with applicable data protection laws, including GDPR and CCPA.

## 2. Data Retention Principles

### 2.1 Core Principles
- **Necessity**: We only retain data as long as necessary for specified purposes
- **Proportionality**: Retention periods are proportionate to the purpose of processing
- **Legal Compliance**: Retention periods comply with applicable legal requirements
- **User Control**: Users can request deletion of their data subject to legal obligations
- **Security**: Retained data is protected with appropriate security measures

### 2.2 Retention Factors
Retention periods are determined based on:
- Business and operational needs
- Legal and regulatory requirements
- User preferences and consent
- Data sensitivity and risk levels
- Technical implementation constraints

## 3. Data Categories and Retention Schedules

### 3.1 Account and Profile Data

**Data Types**: Email address, name, profile settings, AI preferences, productivity configuration

**Retention Period**: Active account duration + 30 days after account deletion

**Deletion Process**:
- Immediate deletion upon user request through app settings
- Automated deletion 30 days after account termination
- Backup systems purged within 90 days

**Legal Basis**: Contract performance, user consent, legitimate interests

### 3.2 Authentication Data

**Data Types**: OAuth tokens, session tokens, device identifiers, login timestamps

**Retention Period**: 
- Active tokens: Until logout or token expiration
- Login history: 12 months
- Failed authentication logs: 6 months

**Deletion Process**:
- Tokens invalidated immediately upon logout
- Historical logs automatically purged after retention period
- Emergency revocation available for security incidents

**Legal Basis**: Security, fraud prevention, legitimate interests

### 3.3 Productivity and Usage Data

**Data Types**: Task completion patterns, app usage analytics, feature interactions, session data

**Retention Period**: 
- Individual usage data: 24 months
- Anonymized analytics: 36 months
- Real-time session data: 24 hours

**Deletion Process**:
- User-specific data deleted upon account deletion
- Data anonymization after 24 months
- Aggregated insights retained for product improvement

**Legal Basis**: Legitimate interests, service improvement, user consent

### 3.4 AI Training and Personalization Data

**Data Types**: AI suggestion history, approval/rejection patterns, personalization algorithms, learning models

**Retention Period**:
- Personal AI models: Active account duration + 6 months
- Anonymized training data: 36 months
- Suggestion history: 12 months

**Deletion Process**:
- Personal AI models deleted with account deletion
- Historical suggestions purged after 12 months
- Anonymized data retention for model improvement

**Legal Basis**: Legitimate interests, service personalization, user consent

### 3.5 Communication and Chat Data

**Data Types**: Chat messages, AI conversations, support communications, feedback submissions

**Retention Period**:
- Chat messages: 12 months
- Support communications: 36 months
- AI conversation logs: 6 months (anonymized after 3 months)

**Deletion Process**:
- Chat messages deleted upon user request or retention expiry
- Support communications retained for service improvement
- Anonymization process removes personal identifiers

**Legal Basis**: Service provision, support, legitimate interests

### 3.6 Achievement and Gamification Data

**Data Types**: Achievement progress, XP scores, milestone history, leaderboard data

**Retention Period**:
- Personal achievements: Active account duration + 12 months
- Historical progress: 24 months
- Anonymized statistics: Indefinite

**Deletion Process**:
- Personal achievements deleted with account deletion
- Historical data anonymized after retention period
- Statistical aggregations preserved for product analytics

**Legal Basis**: Service provision, user engagement, legitimate interests

### 3.7 Device and Technical Data

**Data Types**: Device information, IP addresses, app version, crash reports, performance data

**Retention Period**:
- Device identifiers: 18 months
- IP addresses: 12 months (anonymized after 3 months)
- Crash reports: 24 months
- Performance metrics: 12 months

**Deletion Process**:
- Device data deleted upon account deletion or retention expiry
- IP addresses anonymized for privacy protection
- Technical data retained for security and performance optimization

**Legal Basis**: Legitimate interests, security, service improvement

### 3.8 Location Data

**Data Types**: General location (city/country level), timezone data

**Retention Period**: 
- Location data: 6 months
- Timezone preferences: Active account duration

**Deletion Process**:
- Location data automatically purged after 6 months
- Timezone settings deleted with account deletion
- No precise location data is collected or retained

**Legal Basis**: Service personalization, analytics (anonymized)

## 4. Automated Deletion Procedures

### 4.1 Scheduled Deletion Tasks
- **Daily**: Expired tokens, temporary session data
- **Weekly**: Anonymization of aged IP addresses and device identifiers  
- **Monthly**: Purging of expired chat messages and usage logs
- **Quarterly**: Review and deletion of aged account data

### 4.2 Trigger-Based Deletion
- **Account Deletion**: Immediate deletion of personal data within 30 days
- **Data Export Request**: Comprehensive data package generation
- **Legal Request**: Expedited deletion for legal compliance
- **Security Incident**: Emergency data purging if required

### 4.3 Backup and Archive Management
- **Live Backups**: Subject to same retention periods as production data
- **Archived Backups**: Maximum 90-day retention for deleted data
- **Disaster Recovery**: Separate retention schedule for business continuity
- **Compliance Exports**: Special handling for legal and regulatory requests

## 5. User Rights and Data Control

### 5.1 Data Access Rights
- **Data Export**: Complete personal data export in JSON format
- **Data Inventory**: List of all data categories we maintain about you
- **Processing Information**: Details about how your data is used
- **Third-Party Sharing**: Information about data sharing with service providers

### 5.2 Data Correction Rights
- **Profile Updates**: Real-time updates to account and profile information
- **Data Accuracy**: Report and correct inaccurate personal data
- **Preference Changes**: Modify AI and privacy preferences at any time
- **Consent Management**: Withdraw or modify consent for specific data uses

### 5.3 Data Deletion Rights
- **Account Deletion**: Complete account and data removal
- **Selective Deletion**: Remove specific data categories (where technically feasible)
- **Right to be Forgotten**: Comprehensive data removal under GDPR
- **Data Minimization**: Request reduced data collection and retention

### 5.4 Data Portability Rights
- **Export Formats**: JSON, CSV, or other structured formats
- **Complete Dataset**: All personal data in a machine-readable format
- **Selective Export**: Choose specific data categories for export
- **Transfer Assistance**: Support for data migration to other services

## 6. Legal and Regulatory Compliance

### 6.1 GDPR Compliance (EU Users)
- **Lawful Basis**: Clear legal basis for all data retention
- **Data Minimization**: Retention limited to necessary purposes
- **Storage Limitation**: Data deleted when no longer needed
- **User Rights**: Full implementation of GDPR subject rights

### 6.2 CCPA Compliance (California Users)
- **Right to Delete**: Deletion of personal information upon request
- **Right to Know**: Disclosure of retention periods and purposes
- **Non-Discrimination**: No penalties for exercising privacy rights
- **Authorized Agents**: Support for designated agent requests

### 6.3 Other Jurisdictions
- **Flexible Framework**: Adaptable to other privacy law requirements
- **Regular Review**: Periodic assessment of international compliance
- **Local Requirements**: Accommodation of specific jurisdictional needs
- **Future Legislation**: Framework ready for emerging privacy laws

## 7. Data Security During Retention

### 7.1 Encryption and Protection
- **Encryption at Rest**: All stored data encrypted using AES-256
- **Encryption in Transit**: TLS 1.3 for all data transmissions
- **Access Controls**: Role-based access with minimum necessary privileges
- **Audit Logging**: Comprehensive logs of all data access and modifications

### 7.2 Data Classification
- **Highly Sensitive**: Personal identifiers, authentication data
- **Sensitive**: Usage patterns, communication data
- **Internal**: Anonymized analytics, aggregated statistics
- **Public**: General product information, public achievements

### 7.3 Incident Response
- **Breach Detection**: Automated monitoring for unauthorized access
- **Incident Response**: Documented procedures for data incidents
- **User Notification**: Prompt notification of any data breaches
- **Regulatory Reporting**: Compliance with breach notification requirements

## 8. Third-Party Data Retention

### 8.1 Service Provider Requirements
- **Data Processing Agreements**: Binding agreements with all processors
- **Retention Alignment**: Processor retention periods aligned with our policy
- **Deletion Obligations**: Contractual requirements for data deletion
- **Audit Rights**: Right to audit processor data handling practices

### 8.2 Integration Data
- **Google OAuth**: Subject to Google's retention policies
- **Cloud Infrastructure**: Supabase data retention aligned with our requirements
- **Analytics Services**: Anonymized data only, subject to service provider terms
- **Support Tools**: Limited retention for customer service purposes

## 9. Data Retention Governance

### 9.1 Policy Review and Updates
- **Annual Review**: Comprehensive policy review and updates
- **Legal Changes**: Updates in response to new privacy laws
- **Technical Changes**: Adjustments for new features or systems
- **User Feedback**: Policy improvements based on user input

### 9.2 Internal Compliance
- **Training**: Regular staff training on data retention requirements
- **Monitoring**: Ongoing monitoring of retention compliance
- **Documentation**: Detailed records of data retention decisions
- **Accountability**: Clear roles and responsibilities for data governance

### 9.3 External Oversight
- **Privacy Officer**: Designated privacy officer oversight
- **Legal Review**: Regular legal review of retention practices
- **External Audits**: Periodic third-party privacy audits
- **Regulatory Engagement**: Proactive engagement with privacy authorities

## 10. Contact Information

### 10.1 Data Retention Inquiries
- **Email**: retention@omnii.net
- **Subject Line**: "Data Retention Inquiry"
- **Response Time**: Within 48 hours for general inquiries

### 10.2 Rights Requests
- **Email**: privacy@omnii.net
- **In-App**: Data Management section in Profile settings
- **Online Form**: https://omnii.net/data-requests
- **Response Time**: 30 days (GDPR), 45 days (CCPA)

### 10.3 Urgent Issues
- **Security**: security@omnii.net
- **Legal**: legal@omnii.net
- **DPO**: dpo@omnii.net (for GDPR matters)

---

**Document Control**:
- **Effective Date**: May 30, 2025
- **Next Review**: May 30, 2026
- **Approval**: OMNII Privacy Officer
- **Contact**: privacy@omnii.net

This Data Retention Policy is part of our comprehensive privacy framework and works in conjunction with our Privacy Policy and Terms of Service to protect your data rights. 