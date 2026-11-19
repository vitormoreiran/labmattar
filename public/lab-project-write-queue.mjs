// Serialize asynchronous project writes. Do not let an older revision finish
// after a newer one: every write begins after the previous write settles.
export function createProjectWriteQueue(write){
  let tail=Promise.resolve();
  return record=>{
    const pending=tail.catch(()=>{}).then(()=>write(record));
    tail=pending;
    return pending;
  };
}
