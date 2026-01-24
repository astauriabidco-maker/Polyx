
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Register nice fonts if available, or fallback
// Font.register({ family: 'Inter', src: '...' });

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 40,
        fontFamily: 'Helvetica'
    },
    header: {
        marginBottom: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #E2E8F0',
        paddingBottom: 20
    },
    logo: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#4F46E5' // Indigo 600
    },
    date: {
        fontSize: 10,
        color: '#64748B'
    },
    title: {
        fontSize: 24,
        marginBottom: 20,
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 2,
        color: '#1E293B'
    },
    subtitle: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 40
    },
    candidateSection: {
        backgroundColor: '#F8FAFC',
        padding: 20,
        borderRadius: 8,
        marginBottom: 40
    },
    label: {
        fontSize: 10,
        color: '#64748B',
        marginBottom: 4,
        textTransform: 'uppercase'
    },
    value: {
        fontSize: 14,
        color: '#0F172A',
        fontWeight: 'bold'
    },
    resultSection: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 40
    },
    box: {
        flex: 1,
        padding: 20,
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        alignItems: 'center'
    },
    levelBox: {
        borderColor: '#4F46E5',
        backgroundColor: '#EEF2FF'
    },
    level: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#4F46E5'
    },
    score: {
        fontSize: 24,
        color: '#1E293B'
    },
    recommendation: {
        marginTop: 20,
        padding: 15,
        backgroundColor: '#F0FDF4',
        borderLeft: '4px solid #22C55E'
    },
    recText: {
        fontSize: 12,
        color: '#166534',
        lineHeight: 1.5
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        fontSize: 10,
        color: '#94A3B8',
        textAlign: 'center',
        borderTop: '1px solid #E2E8F0',
        paddingTop: 10
    }
});

interface AssessmentCertificateProps {
    candidateName: string;
    date: string;
    level: string;
    score: number;
    recommendation: string;
    token: string;
}

export const AssessmentCertificate = ({
    candidateName,
    date,
    level,
    score,
    recommendation,
    token
}: AssessmentCertificateProps) => (
    <Document>
        <Page size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.logo}>POLYX</Text>
                <Text style={styles.date}>Fait le {date}</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>ATTESTATION DE POSITIONNEMENT LINGUISTIQUE</Text>

            {/* Candidate */}
            <View style={styles.candidateSection}>
                <Text style={styles.label}>Candidat(e)</Text>
                <Text style={styles.value}>{candidateName}</Text>
            </View>

            {/* Results */}
            <View style={styles.resultSection}>
                <View style={[styles.box, styles.levelBox]}>
                    <Text style={[styles.label, { color: '#4338CA' }]}>Niveau CECRL Global</Text>
                    <Text style={styles.level}>{level}</Text>
                </View>
                <View style={styles.box}>
                    <Text style={styles.label}>Score</Text>
                    <Text style={styles.score}>{score}%</Text>
                </View>
            </View>

            {/* Recommendation (Gap Analysis) */}
            <View style={styles.recommendation}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#15803D', marginBottom: 8, textTransform: 'uppercase' }}>
                    Préconisation Pédagogique
                </Text>
                <Text style={styles.recText}>
                    Objectif visé : <Text style={{ fontWeight: 'bold' }}>{recommendation.split(':')[0] || 'N/A'}</Text>
                </Text>
                <Text style={[styles.recText, { marginTop: 4 }]}>
                    Volume d'heures recommandé : <Text style={{ fontWeight: 'bold', fontSize: 14 }}>{recommendation.match(/(\d+)\s*Heures/i)?.[0] || 'Sur devis'}</Text>
                </Text>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text>Document généré automatiquement par Polyx. Fait valoir ce que de droit.</Text>
            </View>
        </Page>
    </Document>
);
