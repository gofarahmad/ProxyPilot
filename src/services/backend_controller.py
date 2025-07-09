
# src/services/backend_controller.py
# A centralized Python script to interact with the Ubuntu 22.04 system.
# It uses ModemManager (mmcli) and systemd (systemctl) for robust control.
# It now dynamically generates and writes 3proxy configuration files.

import sys
import json
import subprocess
import os
import random
import string
from pathlib import Path
import shutil
import datetime

# --- Configuration ---
# Writable directory in the user's home folder for application state.
# Using the home directory prevents app restarts in development when state files change.
STATE_DIR = Path(os.path.expanduser("~")) / ".proxy_pilot_state"
STATE_DIR.mkdir(exist_ok=True)
PROXY_CONFIGS_FILE = STATE_DIR / "proxy_configs.json"
LOG_FILE = STATE_DIR / "activity.log"
LOG_MAX_ENTRIES = 200


# Writable directory for 3proxy .cfg files.
# IMPORTANT: The user running the Node.js app must have write permissions here.
# For example: sudo mkdir -p /etc/3proxy/conf && sudo chown -R your_user:your_user /etc/3proxy
THREPROXY_CONFIG_DIR = Path("/etc/3proxy/conf")

# Port and credential generation config
PORT_RANGE_START = 30000
PORT_RANGE_END = 31000
USERNAME_LENGTH = 8
PASSWORD_LENGTH = 12

# --- Logging Helper ---
def log_message(level, message):
    """Appends a log message to the activity log file."""
    try:
        timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
        log_entry = json.dumps({"timestamp": timestamp, "level": level, "message": message})
        
        # Read existing logs to truncate if necessary
        lines = []
        if LOG_FILE.exists():
            with open(LOG_FILE, 'r') as f:
                lines = f.readlines()
        
        # Keep the log file from growing indefinitely
        while len(lines) >= LOG_MAX_ENTRIES:
            lines.pop(0)
            
        lines.append(log_entry + '\n')
        
        with open(LOG_FILE, 'w') as f:
            f.writelines(lines)

    except Exception as e:
        # If logging fails, print to stderr so it can be seen in service logs
        sys.stderr.write(f"Logging failed: {e}\n")


# --- Helper Functions ---

def run_command(command_list, use_sudo=True, timeout=15):
    """Executes a shell command and returns its output or raises an error."""
    try:
        # Prepend sudo for specific commands if not already present
        if use_sudo and shutil.which('sudo') and command_list[0] != 'sudo':
            command_list.insert(0, 'sudo')

        result = subprocess.run(
            command_list,
            check=True,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        log_message("ERROR", f"Command timed out: {' '.join(command_list)}")
        raise Exception(f"Command timed out: {' '.join(command_list)}")
    except subprocess.CalledProcessError as e:
        error_output = e.stderr.strip() if e.stderr else "No error output."
        log_message("ERROR", f"Command failed: {' '.join(command_list)}. Error: {error_output}")
        if "couldn't find bearer" in error_output.lower():
            return json.dumps({"bearer_error": True, "message": error_output})
        raise Exception(f"Command failed: {' '.join(command_list)}\nError: {error_output}")
    except FileNotFoundError:
        log_message("ERROR", f"Command not found: {command_list[0]}. Is it installed and in your PATH?")
        raise Exception(f"Command not found: {command_list[0]}. Is it installed and in your PATH?")

def run_and_parse_json(command_list, use_sudo=True, timeout=15):
    """Executes a command and parses its stdout as JSON."""
    raw_output = run_command(command_list, use_sudo, timeout)
    if not raw_output:
        return {}
    try:
        return json.loads(raw_output)
    except json.JSONDecodeError:
        log_message("ERROR", f"Failed to parse JSON from command: {' '.join(command_list)}")
        raise Exception(f"Failed to parse JSON from command: {' '.join(command_list)}\nOutput: {raw_output}")

def read_state_file(file_path, default_value={}):
    """Reads a JSON state file."""
    if not file_path.exists():
        return default_value
    with open(file_path, 'r') as f:
        try:
            return json.load(f)
        except (json.JSONDecodeError, IOError):
            return default_value

def write_state_file(file_path, data):
    """Writes data to a JSON state file."""
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)

def generate_random_string(length):
    """Generates a random alphanumeric string."""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def get_or_create_proxy_config(interface_name, all_configs):
    """Gets existing config or creates a new one with an available port and credentials."""
    if interface_name in all_configs and 'port' in all_configs[interface_name]:
        return all_configs[interface_name], False

    used_ports = {config.get('port') for config in all_configs.values() if 'port' in config}
    new_port = PORT_RANGE_START
    while new_port in used_ports:
        new_port += 1
        if new_port > PORT_RANGE_END:
            raise Exception("No available ports in the specified range.")

    new_config = {
        "port": new_port,
        "username": generate_random_string(USERNAME_LENGTH),
        "password": generate_random_string(PASSWORD_LENGTH),
        "type": "3proxy",
        "bindIp": None
    }
    log_message("INFO", f"Generated new proxy config for {interface_name} on port {new_port}.")
    return new_config, True

def generate_3proxy_config_content(config, ip_address):
    """Generates the content for a 3proxy .cfg file, enabling both SOCKS5 and HTTP."""
    if not all([config.get('username'), config.get('password'), config.get('port'), ip_address]):
        return None # Not enough info to generate config

    return f"""
# Dynamically generated by Proxy Pilot for interface with IP {ip_address}
daemon
nserver 8.8.8.8
nserver 8.8.4.4
nscache 65536
timeouts 1 5 30 60 180 1800 15 60

users {config['username']}:CL:{config['password']}
allow {config['username']}

# SOCKS5 proxy service
socks -p{config['port']} -i127.0.0.1 -e{ip_address}

# HTTP proxy service on the same port
proxy -p{config['port']} -i127.0.0.1 -e{ip_address}
"""

def write_3proxy_config_file(interface_name, ip_address):
    """Generates and writes the 3proxy config file for a given interface."""
    try:
        THREPROXY_CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        
        all_configs = read_state_file(PROXY_CONFIGS_FILE)
        interface_config = all_configs.get(interface_name)
        
        if not interface_config:
            raise Exception(f"No configuration found for {interface_name}")
            
        config_content = generate_3proxy_config_content(interface_config, ip_address)
        if not config_content:
            raise Exception(f"Could not generate config content for {interface_name} with IP {ip_address}")
            
        config_file_path = THREPROXY_CONFIG_DIR / f"{interface_name}.cfg"
        
        with open(config_file_path, 'w') as f:
            f.write(config_content)
        log_message("INFO", f"Wrote 3proxy config for {interface_name} to {config_file_path}.")
        return str(config_file_path)
    except Exception as e:
        log_message("ERROR", f"Failed to write 3proxy config for {interface_name}: {e}")
        raise Exception(f"Failed to write 3proxy config for {interface_name}: {e}")

# --- Core Logic Functions ---
def is_command_available(command):
    """Check if a command is available on the system."""
    return shutil.which(command) is not None

def get_all_modem_statuses():
    """Retrieves the status of all available modems. Returns an empty list on failure."""
    if not is_command_available("mmcli"):
        log_message("ERROR", "`mmcli` command not found. Please install ModemManager.")
        raise Exception("`mmcli` command not found. Please install ModemManager (`sudo apt-get install modemmanager`).")

    try:
        modem_list_data = run_and_parse_json(['mmcli', '-L', '-J'])
        modems = modem_list_data.get('modem-list', [])
        
        if not modems:
            log_message("INFO", "No modems detected by mmcli.")
            return {"success": True, "data": []}
        
        status_list = []
        proxy_configs = read_state_file(PROXY_CONFIGS_FILE)
        configs_changed = False

        for modem_path in modems:
            try:
                modem_details_data = run_and_parse_json(['mmcli', '-m', modem_path, '-J'])
            except Exception as e:
                log_message("WARN", f"Could not get details for modem {modem_path}. Error: {e}")
                continue

            modem_info = modem_details_data.get('modem', {})
            
            device_id = modem_info.get('generic', {}).get('device-identifier', 'N/A')
            interface_name = modem_info.get('generic', {}).get('primary-port', 'N/A')
            
            if interface_name == 'N/A': continue

            state = modem_info.get('status', {}).get('state', 'unknown')
            app_status = 'connected' if state in ['connected', 'registered'] else 'disconnected'

            bearer_path = modem_info.get('generic', {}).get('bearer', None)
            ip_address = None
            if bearer_path and bearer_path != "/":
                try:
                    bearer_details = run_and_parse_json(['mmcli', '-b', bearer_path, '-J'])
                    if not bearer_details.get("bearer_error"):
                        ip_address = bearer_details.get('bearer', {}).get('ipv4-config', {}).get('address', None)
                except Exception as e:
                     log_message("WARN", f"Could not get bearer details for {bearer_path}. Error: {e}")


            proxy_status = 'stopped'
            proxy_type = '3proxy'
            try:
                service_name = f"{proxy_type}@{interface_name}.service"
                run_command(['systemctl', 'is-active', '--quiet', service_name], use_sudo=False) # systemctl doesn't need sudo for status checks
                proxy_status = 'running'
            except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
                proxy_status = 'stopped' # Or error, but stopped is safer for UI
            except Exception:
                 proxy_status = 'error'


            modem_proxy_config, created = get_or_create_proxy_config(interface_name, proxy_configs)
            if created:
                proxy_configs[interface_name] = modem_proxy_config
                configs_changed = True
            
            current_bind_ip = proxy_configs.get(interface_name, {}).get('bindIp')
            if ip_address and current_bind_ip != ip_address:
                 proxy_configs.setdefault(interface_name, {})['bindIp'] = ip_address
                 configs_changed = True

            status_list.append({
                "id": device_id,
                "name": f"Modem ({device_id[-4:]})",
                "interfaceName": interface_name,
                "status": app_status,
                "ipAddress": ip_address,
                "proxyType": proxy_type,
                "proxyStatus": proxy_status,
            })

        if configs_changed:
            write_state_file(PROXY_CONFIGS_FILE, proxy_configs)

        return {"success": True, "data": status_list}
    except Exception as e:
        log_message("ERROR", f"Error in get_all_modem_statuses: {e}")
        return {"success": False, "error": str(e)}


def proxy_action(action, interface_name):
    """Starts, stops, or restarts a 3proxy service, writing config first."""
    try:
        log_message("INFO", f"Attempting to {action} proxy for {interface_name}.")
        if action in ['start', 'restart']:
            statuses_result = get_all_modem_statuses()
            if not statuses_result['success']:
                raise Exception("Could not get modem statuses to find IP for config writing.")
            
            modem_status = next((m for m in statuses_result['data'] if m['interfaceName'] == interface_name), None)
            if not modem_status or not modem_status['ipAddress']:
                 raise Exception(f"Modem {interface_name} is not connected or has no IP address. Cannot {action} proxy.")

            write_3proxy_config_file(interface_name, modem_status['ipAddress'])

        service_name = f"3proxy@{interface_name}.service"
        run_command(['systemctl', action, service_name])
        log_message("INFO", f"Proxy {action} successful for {interface_name}.")
        return {"success": True, "data": {"message": f"Proxy {action} successful for {interface_name}"}}
    except Exception as e:
        log_message("ERROR", f"Proxy action '{action}' for {interface_name} failed: {e}")
        return {"success": False, "error": str(e)}


def modem_action(action, interface_name, args_json):
    """Handles SMS and USSD actions by finding the correct modem path."""
    try:
        args = json.loads(args_json)
        log_message("INFO", f"Performing modem action '{action}' for {interface_name}.")
        
        if not is_command_available("mmcli"):
            raise Exception("`mmcli` command not found. Please install ModemManager.")

        modem_list_data = run_and_parse_json(['mmcli', '-L', '-J'])
        modem_mm_path = None
        for modem_path in modem_list_data.get('modem-list', []):
            try:
                modem_details_data = run_and_parse_json(['mmcli', '-m', modem_path, '-J'])
                if modem_details_data.get('modem', {}).get('generic', {}).get('primary-port') == interface_name:
                    modem_mm_path = modem_path
                    break
            except Exception:
                continue
        
        if not modem_mm_path:
            raise Exception(f"Could not find modem with interface '{interface_name}'")

        if action == 'send-sms':
            create_result = run_and_parse_json(['mmcli', '-m', modem_mm_path, f'--messaging-create-sms=text="{args["message"]}",number="{args["recipient"]}"', '-J'])
            sms_path = create_result.get('sms', {}).get('path')
            if not sms_path:
                raise Exception("Failed to create SMS. The modem may be busy or not registered.")
            run_command(['mmcli', '-s', sms_path, '--send'])
            run_command(['mmcli', '-m', modem_mm_path, f'--messaging-delete-sms={sms_path.split("/")[-1]}'])
            log_message("INFO", f"SMS sent to {args['recipient']} via {interface_name}.")
            return {"success": True, "data": {"message": "SMS sent successfully."}}

        elif action == 'read-sms':
            list_result = run_and_parse_json(['mmcli', '-m', modem_mm_path, '--messaging-list-sms', '-J'])
            sms_paths = list_result.get('modem', {}).get('messaging', {}).get('sms', [])
            messages = []
            for sms_path in sms_paths:
                sms_details_data = run_and_parse_json(['mmcli', '-s', sms_path, '-J'])
                sms_details = sms_details_data.get('sms', {})
                content = sms_details.get('content', {})
                messages.append({
                    "id": sms_path.split('/')[-1],
                    "from": content.get('number', 'Unknown'),
                    "timestamp": sms_details.get('properties', {}).get('timestamp', ''),
                    "content": content.get('text', '')
                })
            log_message("INFO", f"Read {len(messages)} SMS messages from {interface_name}.")
            return {"success": True, "data": messages}

        elif action == 'send-ussd':
            response_str = run_command(['mmcli', '-m', modem_mm_path, f'--3gpp-ussd-initiate={args["ussdCode"]}'])
            log_message("INFO", f"USSD command '{args['ussdCode']}' sent via {interface_name}.")
            return {"success": True, "data": {"response": response_str}}
            
        return {"success": False, "error": "Unknown modem action"}
    except Exception as e:
        log_message("ERROR", f"Modem action '{action}' for {interface_name} failed: {e}")
        return {"success": False, "error": str(e)}

def rotate_ip(interface_name):
    """Disconnects and reconnects a modem to get a new IP, then restarts the proxy."""
    try:
        log_message("INFO", f"Attempting IP rotation for {interface_name}.")
        if not is_command_available("mmcli"):
            raise Exception("`mmcli` command not found.")

        statuses_result = get_all_modem_statuses()
        modem_to_rotate = next((m for m in statuses_result['data'] if m['interfaceName'] == interface_name), None)
        if not modem_to_rotate:
            raise Exception(f"Interface {interface_name} not found.")

        modem_details_data = run_and_parse_json(['mmcli', '-m', modem_to_rotate['id'], '-J'])
        bearer_path = modem_details_data.get('modem', {}).get('generic', {}).get('bearer', None)
        
        if not bearer_path or bearer_path == "/":
            run_command(['mmcli', '-m', modem_to_rotate['id'], '--simple-connect=any'])
        else:
            run_command(['mmcli', '-b', bearer_path, '--disconnect'], timeout=30)
            run_command(['sleep', '5'], use_sudo=False, timeout=10)
            run_command(['mmcli', '-m', modem_to_rotate['id'], '--simple-connect=any'], timeout=45)
        
        run_command(['sleep', '5'], use_sudo=False, timeout=10)

        restart_result = proxy_action('restart', interface_name)
        if not restart_result['success']:
             raise Exception(f"IP rotation seems successful, but failed to restart proxy: {restart_result['error']}")

        final_statuses = get_all_modem_statuses()
        final_modem = next((m for m in final_statuses.get('data', []) if m['interfaceName'] == interface_name), None)
        new_ip = final_modem.get('ipAddress', 'unknown') if final_modem else 'unknown'

        log_message("INFO", f"IP rotated for {interface_name}. New IP: {new_ip}.")
        return {"success": True, "data": {"message": f"IP rotated for {interface_name}, new IP is {new_ip}.", "newIp": new_ip}}
    except Exception as e:
        log_message("ERROR", f"IP rotation for {interface_name} failed: {e}")
        return {"success": False, "error": str(e)}

def get_ufw_status():
    """Gets the status and rules of UFW."""
    if not is_command_available("ufw"):
        log_message("ERROR", "`ufw` command not found.")
        raise Exception("`ufw` command not found. Please install Uncomplicated Firewall (`sudo apt-get install ufw`).")
    try:
        status_output = run_command(['ufw', 'status'])
        is_active = "Status: active" in status_output
        raw_rules_output = run_command(['ufw', 'show', 'added'])
        parsed_rules = [line.split('#')[0].strip() for line in raw_rules_output.split('\n') if line.strip() and not line.lower().startswith("ufw ")]
        return {"success": True, "data": {"active": is_active, "rules": parsed_rules}}
    except Exception as e:
        return {"success": False, "error": str(e)}

def manage_ufw_rule(action, rule):
    """Manages UFW rules (allow, delete, enable, disable)."""
    if not is_command_available("ufw"):
        log_message("ERROR", "`ufw` command not found.")
        raise Exception("`ufw` command not found.")
    try:
        command = []
        if action in ['enable', 'disable']:
            command = ['ufw', action]
            log_message("INFO", f"Attempting to {action} UFW firewall.")
        elif action in ['allow', 'deny', 'reject', 'delete']:
            if not rule:
                raise ValueError("Rule cannot be empty for this action.")
            command = ['ufw'] + rule.split()
            log_message("INFO", f"Attempting to manage UFW rule: {' '.join(command)}")
        else:
            raise ValueError(f"Unsupported UFW action: {action}")
        
        proc = subprocess.run(['sudo'] + command, input='y', text=True, check=True, capture_output=True, timeout=10)
        run_command(['ufw', 'reload'])
        log_message("INFO", f"UFW action '{' '.join(command)}' successful.")

        return {"success": True, "data": {"message": f"UFW action '{action}' successful."}}
    except Exception as e:
        log_message("ERROR", f"UFW action failed: {e}")
        return {"success": False, "error": str(e)}

def get_logs():
    """Reads the last N lines from the log file."""
    try:
        if not LOG_FILE.exists():
            return {"success": True, "data": []}
        
        with open(LOG_FILE, 'r') as f:
            lines = f.readlines()
            
        # Parse each line from JSON string to a dictionary
        log_entries = [json.loads(line.strip()) for line in lines if line.strip()]
        return {"success": True, "data": log_entries}
    except Exception as e:
        return {"success": False, "error": f"Failed to read log file: {e}"}

def get_all_configs():
    """Reads the entire proxy_configs.json file."""
    try:
        configs = read_state_file(PROXY_CONFIGS_FILE)
        return {"success": True, "data": configs}
    except Exception as e:
        log_message("ERROR", f"Failed to read proxy configs file: {e}")
        return {"success": False, "error": f"Failed to read proxy configs file: {e}"}

# --- Main Execution Block ---

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No action specified."}))
        sys.exit(1)

    action = sys.argv[1]
    result = {}

    try:
        log_message("DEBUG", f"Backend action '{action}' called.")
        if action == 'get_all_modem_statuses':
            result = get_all_modem_statuses()
        elif action == 'rotate_ip':
            result = rotate_ip(sys.argv[2])
        elif action in ['start', 'stop', 'restart']:
            result = proxy_action(action, sys.argv[2])
        elif action in ['send-sms', 'read-sms', 'send-ussd']:
            result = modem_action(action, sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else '{}')
        elif action == 'get_ufw_status':
            result = get_ufw_status()
        elif action == 'manage_ufw_rule':
            result = manage_ufw_rule(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else '')
        elif action == 'get_logs':
            result = get_logs()
        elif action == 'get_all_configs':
            result = get_all_configs()
        else:
            result = {"success": False, "error": f"Unknown action: {action}"}
    
    except Exception as e:
        result = {"success": False, "error": f"An unexpected error occurred in main: {str(e)}"}
        log_message("ERROR", f"Unexpected error in main for action '{action}': {e}")

    print(json.dumps(result))

if __name__ == "__main__":
    main()
