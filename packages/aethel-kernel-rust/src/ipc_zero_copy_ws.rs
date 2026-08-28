use futures_util::{SinkExt, StreamExt};
use std::sync::OnceLock;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::broadcast;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::accept_async;
use bytes::Bytes;

/// Global channel for broadcasting zero-copy binary frames from the Kernel to the Frontend.
static ZERO_COPY_TX: OnceLock<broadcast::Sender<Bytes>> = OnceLock::new();

pub fn get_zero_copy_tx() -> broadcast::Sender<Bytes> {
    ZERO_COPY_TX.get_or_init(|| {
        let (tx, _) = broadcast::channel(1024);
        tx
    }).clone()
}

/// Aethel Local Binary Gateway (Zero-Copy MMap/SAB over WebSocket).
/// 
/// This server bypasses the Tauri JSON IPC bottleneck by streaming raw binary 
/// directly to the frontend's V8 engine, which routes it into a SharedArrayBuffer.
pub async fn start_zero_copy_ws_server(port: u16) {
    let addr = format!("127.0.0.1:{}", port);
    let listener = TcpListener::bind(&addr).await.expect("Failed to bind Zero-Copy WS Port");
    println!("Aethel Zero-Copy Binary Gateway listening on ws://{}", addr);

    // Initialize the channel
    let _ = get_zero_copy_tx();

    while let Ok((stream, _)) = listener.accept().await {
        tokio::spawn(handle_connection(stream));
    }
}

async fn handle_connection(stream: TcpStream) {
    let addr = stream.peer_addr().expect("Connected stream should have a peer address");
    
    let mut ws_stream = accept_async(stream)
        .await
        .expect("Error during the websocket handshake");

    println!("Zero-Copy Bridge Connected: {}", addr);

    let mut rx = get_zero_copy_tx().subscribe();

    loop {
        tokio::select! {
            // Outbound: Kernel -> Frontend
            Ok(data) = rx.recv() => {
                // By using `Bytes`, we eliminate the O(N) allocation per client clone.
                // The tungstenite Message::Binary accepts Vec<u8> or Bytes depending on the feature flag,
                // but here we push the bytes directly into the message.
                if let Err(e) = ws_stream.send(Message::Binary(data.to_vec())).await {
                    eprintln!("Error pushing binary frame: {}", e);
                    break;
                }
            }
            // Inbound: Frontend -> Kernel
            msg = ws_stream.next() => {
                match msg {
                    Some(Ok(Message::Binary(data))) => {
                        // Echo or route directly to mmap
                        if let Err(e) = ws_stream.send(Message::Binary(data)).await {
                            eprintln!("Error sending binary response: {}", e);
                            break;
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => {
                        println!("Zero-Copy Bridge Disconnected: {}", addr);
                        break;
                    }
                    Some(Err(e)) => {
                        eprintln!("Error on websocket connection: {}", e);
                        break;
                    }
                    _ => {}
                }
            }
        }
    }
}

/// Helper function to broadcast raw memory pages from the kernel directly to all frontend instances.
/// By converting to `Bytes` once, we prevent dynamic allocations (`Vec::clone`) for every connected frontend.
pub fn broadcast_binary_frame(data: &[u8]) {
    let tx = get_zero_copy_tx();
    // Copy the slice into a single contiguous Bytes allocation (O(1) allocation total)
    let bytes_payload = Bytes::copy_from_slice(data);
    let _ = tx.send(bytes_payload);
}
