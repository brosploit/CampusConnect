package edu.campusconnect

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import edu.campusconnect.core.security.SecureTokenStorage
import edu.campusconnect.feature.diagnostics.DiagnosticViewModel
import edu.campusconnect.feature.monitoring.MonitoringViewModel

class MainActivity : ComponentActivity() {

    private lateinit var tokenStorage: SecureTokenStorage
    private lateinit var diagnosticViewModel: DiagnosticViewModel
    private lateinit var monitoringViewModel: MonitoringViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        tokenStorage = SecureTokenStorage(applicationContext)
        diagnosticViewModel = DiagnosticViewModel(applicationContext, tokenStorage)
        monitoringViewModel = MonitoringViewModel(applicationContext, tokenStorage)

        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    MainScreen(diagnosticViewModel, monitoringViewModel)
                }
            }
        }
    }
}

@Composable
fun MainScreen(
    diagnosticViewModel: DiagnosticViewModel,
    monitoringViewModel: MonitoringViewModel
) {
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Manual Test", "Monitoring", "Privacy")

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text(
            text = "Campus Connect",
            style = MaterialTheme.typography.headlineMedium
        )
        Text(
            text = "Connectivity Intelligence Platform",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.secondary
        )

        Spacer(modifier = Modifier.height(16.dp))

        TabRow(selectedTabIndex = selectedTab) {
            tabs.forEachIndexed { index, title ->
                Tab(
                    selected = selectedTab == index,
                    onClick = { selectedTab = index },
                    text = { Text(title) }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        when (selectedTab) {
            0 -> ManualDiagnosticView(diagnosticViewModel)
            1 -> MonitoringView(monitoringViewModel)
            2 -> PrivacyInfoView()
        }
    }
}

@Composable
fun ManualDiagnosticView(viewModel: DiagnosticViewModel) {
    val state by viewModel.uiState.collectAsState()

    Column(modifier = Modifier.fillMaxWidth()) {
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(text = "Selected Campus Zone: ${state.selectedZoneName}", style = MaterialTheme.typography.titleMedium)
                Text(text = "Zone ID: ${state.selectedZoneId}", style = MaterialTheme.typography.bodySmall)
                Spacer(modifier = Modifier.height(8.dp))
                Text(text = "Transport: ${state.activeTransport}")
                Text(text = "Latency: ${state.latencyMs?.let { "${it}ms" } ?: "Not measured"}")
                Text(text = "Signal: ${state.signalDbm?.let { "${it}dBm" } ?: "Unavailable"}")
                Text(text = "Carrier: ${state.carrierLabel ?: "Unavailable"}")
                Text(text = "Status: ${state.diagnosticFinding}")
                Text(text = "Queue Status: ${state.uploadStatus}")
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = { viewModel.runDiagnostics() },
            enabled = !state.isRunning,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (state.isRunning) "Running Observation..." else "Run Diagnostics")
        }
    }
}

@Composable
fun MonitoringView(viewModel: MonitoringViewModel) {
    val state by viewModel.uiState.collectAsState()

    Column(modifier = Modifier.fillMaxWidth()) {
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(text = "Optional Background Monitoring", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                Text(text = "Consent: Off by default. Collects zone diagnostics only. Shows ongoing notification with Stop control. Max 30 minutes.")
                Spacer(modifier = Modifier.height(8.dp))
                Text(text = "Duration: ${state.selectedDurationMinutes} minutes")
                Text(text = "Active: ${if (state.isMonitoringActive) "YES (Running)" else "NO (Stopped)"}")
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (!state.isMonitoringActive) {
            Button(
                onClick = { viewModel.startMonitoring() },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Opt-In & Start Monitoring")
            }
        } else {
            Button(
                onClick = { viewModel.stopMonitoring() },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Stop Monitoring Immediately")
            }
        }
    }
}

@Composable
fun PrivacyInfoView() {
    Column(modifier = Modifier.fillMaxWidth()) {
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(text = "Data Minimization & Invariants", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                Text("• Zero IMEI, IMSI, or SIM serial collection.")
                Text("• Zero Contacts, SMS, call logs, or browsing history.")
                Text("• Zero GPS coordinates; broad manual campus-zone selection only.")
                Text("• Diagnostic neutrality: Never infers radio jammers from connectivity drops.")
                Text("• Encrypted local storage (SQLCipher + Android Keystore).")
            }
        }
    }
}
